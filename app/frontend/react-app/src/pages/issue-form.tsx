// SPDX-License-Identifier: Apache-2.0
import { FC, ChangeEvent, useCallback, useEffect, useState } from "react";
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import { BsPlus } from 'react-icons/bs';
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import { addresses } from "@blockchain-carbon-accounting/contracts";
import { encodeParameters, getAdmin, issue, issueAndTrack } from "../services/contract-functions";
import { getTracker } from '../services/api.service';

import type { EmissionsRequest } from "@blockchain-carbon-accounting/data-postgres";
import { getAuditorEmissionsRequest, declineEmissionsRequest, issueEmissionsRequest } from '../services/api.service';
import CreateProposalModal from "../components/create-proposal-modal";
import FormGroupJSON, {KeyValuePair} from "../components/form-group-json"
import SubmissionModal from "../components/submission-modal";
import { Web3Provider, JsonRpcProvider } from "@ethersproject/providers";
import { RolesInfo, TOKEN_TYPES, Wallet } from "../components/static-data";
import WalletLookupInput from "../components/wallet-lookup-input";
import { InputGroup } from "react-bootstrap";
import { useMutation } from "react-query";
import { useLocation } from "wouter";
import AsyncButton from "../components/AsyncButton";
import { parseDate } from "../components/display-date";
import MustUseMetamask from "../components/must-use-metamask";

export type IssueFormProps = {
  provider?: Web3Provider | JsonRpcProvider,
  signedInAddress: string,
  roles: RolesInfo,
  limitedMode: boolean,
  signedInWallet?: Wallet,
  trackerId?: number,
  requestId?: string,
  onSubmit?:()=>void
}

const IssueForm: FC<IssueFormProps> = ({ provider, roles, signedInAddress, limitedMode, signedInWallet, trackerId, requestId, onSubmit}) => {

  const [selectedPendingEmissions, setSelectedPendingEmissions] = useState<EmissionsRequest>();
  const [submissionModalShow, setSubmissionModalShow] = useState(false);
  const [createModalShow, setCreateModalShow] = useState(false);

  const [, setLocation] = useLocation();
  const [error, setError] = useState("");

  // admin address (if contract is in limitedMode)
  const [adminAddress, setAdminAddress] = useState("");

  // Form inputs
  const [address, setAddress] = useState("");
  const [issuedFrom, setIssuedFrom] = useState(localStorage.getItem('issueFrom')! || "");

  const [tokenTypeId, setTokenTypeId] = useState(Number(localStorage.getItem('tokenTypeId')||1));
  const [quantity, setQuantity] = useState(localStorage.getItem('quantity')||"");
  const [fromDate, setFromDate] = useState<Date|null>(localStorage.getItem('fromDate')! ? new Date(localStorage.getItem('fromDate')!): null);
  const [thruDate, setThruDate] = useState<Date|null>(localStorage.getItem('thruDate')! ? new Date(localStorage.getItem('thruDate')!) : null);
  const [description, setDescription] = useState(localStorage.getItem('description')||'');
  const [result, setResult] = useState("");

  const [scope, setScope] = useState<number|null>(null);
  const [type, setType] = useState(localStorage.getItem('type')||'');


  let _metadata:KeyValuePair[]=[];

  if(localStorage.getItem('scope')) _metadata.push({key:'scope', value:localStorage.getItem('scope')} as KeyValuePair)
  if(localStorage.getItem('type')) _metadata.push({key:'type', value:localStorage.getItem('type')} as KeyValuePair)
  if(localStorage.getItem('gwp')) _metadata.push({key:'gwp', value:localStorage.getItem('gwp')} as KeyValuePair)
  
  const [metajson, setMetajson] = useState("");
  const [metadata, setMetadata] = useState<KeyValuePair[]>(_metadata);

  const [manifestjson, setManifestjson] = useState("");
  const [manifest, setManifest] = useState<KeyValuePair[]>(localStorage.getItem('manifest') ? [{key:'source',value:localStorage.getItem('manifest')} as KeyValuePair]:[]);

  // Calldata
  const [calldata, setCalldata] = useState("");

  // After initial onFocus for required inputs, display red outline if invalid
  const [initializedAddressInput, setInitializedAddressInput] = useState(false);
  const [initializedQuantityInput, setInitializedQuantityInput] = useState(false);
  const [initializedTrackerIdInput, setInitializedTrackerIdInput] = useState(false);

  const [requestedTrackerId, setRequestedTrackerId] = useState(trackerId);

  const onTokenTypeIdChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => { setTokenTypeId(parseInt(event.target.value)); }, []);
  const onQuantityChange = useCallback((event: ChangeEvent<HTMLInputElement>) => { setQuantity(event.target.value.replace(/,/g, '')); }, []);
  const onDescriptionChange = useCallback((event: ChangeEvent<HTMLInputElement>) => { setDescription(event.target.value); }, []);
  const onScopeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => { setScope(parseInt(event.target.value)); }, []);
  const onTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => { setType(event.target.value); }, []);

  // params: key-value object list
  const castMetadata = (pairlist: KeyValuePair[]) => {
    const metaObj: any = {};
    pairlist.forEach((elem) => {
      metaObj[elem.key] = elem.value;
    });

    // add scope and type too.
    if (scope) metaObj["scope"] = scope;
    if (type) metaObj["type"] = type;

    return JSON.stringify(metaObj);
  }

  // handle metadata field list
  const removeField = (idx: number) => {
    let array = [...metadata];
    array.splice(idx, 1);
    setMetadata(array);
    setMetajson(castMetadata(metadata));
  }

  const addField = () => {
    metadata.push({key: "", value: ""});
    setMetadata([...metadata]);
    setMetajson(castMetadata(metadata));
  }

  const castManifest = (pairlist: KeyValuePair[]) => {
    const manifestObj: any = {};
    pairlist.forEach((elem) => {
      manifestObj[elem.key] = elem.value;
    });

    return JSON.stringify(manifestObj);
  }

  const addFieldManifest = () => {
    manifest.push({key: "", value: ""});
    setManifest([...manifest]);
    setManifestjson(castManifest(manifest));
  }

  const removeFieldManifest = (idx: number) => {
    let array = [...manifest];
    array.splice(idx, 1);
    setManifest(array);
    setManifestjson(castManifest(manifest));
  }

  function handleSubmit() {
    submit();
    setSubmissionModalShow(true);
    if(onSubmit!){onSubmit()}
  }

  function disableIssueButton(calldata: string, quantity: number|string, address: string, requestId?: string) {
    let qty = Number(quantity);
    if (requestId) {
      return (qty === 0) || (String(address).length === 0)
    }
    return (calldata.length === 0) || (qty === 0) || (String(address).length === 0)
  }

  const declineQuery = useMutation(async () => {
    if (selectedPendingEmissions && selectedPendingEmissions.uuid) {
      try {
        let result = await declineEmissionsRequest(selectedPendingEmissions.uuid);
        if (result && result.status === 'success') {
          setError("");
          setLocation('/emissionsrequests');
        } else {
          setError("Cannot decline emissions request.");
        }
      } catch (error) {
        console.log(error);
        setError("Cannot decline emissions request.");
      }
    } else {
      setError("Empty current pending emission request.");
    }
  });

  const fetchEmissionsRequest = useCallback(async (uuid: string, signedInAddress: string) => {
    try {
      let newEmissionsRequest = await getAuditorEmissionsRequest(uuid);
      if (newEmissionsRequest && newEmissionsRequest.emission_auditor && signedInAddress
          && newEmissionsRequest.emission_auditor.toLowerCase() === signedInAddress.toLowerCase()) {

        if (newEmissionsRequest.token_manifest) {
          const tokenManifest = JSON.parse(newEmissionsRequest.token_manifest);
          let changed = false;
          if (!tokenManifest.request_uuid) {
            tokenManifest.request_uuid = newEmissionsRequest.uuid;
            changed = true;
          }
          if (!tokenManifest.node_id) {
            tokenManifest.node_id = newEmissionsRequest.node_id;
            changed = true;
          }
          if (changed) {
            newEmissionsRequest.token_manifest = JSON.stringify(tokenManifest);
          }

          let mf: KeyValuePair[] = [];
          setManifest(mf);
          setManifestjson("");
          for (const key in tokenManifest) {
            mf.push({key: key, value: tokenManifest[key]});
          }
          setManifest([...mf]);
          setManifestjson(castManifest(mf));
        }

        let md: KeyValuePair[] = [];
        setMetadata(md);
        setMetajson("");
        if (newEmissionsRequest.token_metadata) {
          const tokenMetadata = JSON.parse(newEmissionsRequest.token_metadata);
          //catch requestedTrackerId stored in metadata and update issue form to add emissions to existing carbon tracker
          //console.log(tokenMetadata)
          if(tokenMetadata.TrackerId){
            setRequestedTrackerId(tokenMetadata.TrackerId)
          }
          for (const key in tokenMetadata) {
                md.push({key: key, value: tokenMetadata[key]});
          }
          setMetadata([...md]);
          setMetajson(castManifest(md));
        }

        setSelectedPendingEmissions(newEmissionsRequest);
        if (newEmissionsRequest.issued_from) {
          setIssuedFrom(newEmissionsRequest.issued_from);
        }
        if (newEmissionsRequest.issued_to) {
          setAddress(newEmissionsRequest.issued_to);
        }
        if (newEmissionsRequest.token_total_emissions) {
          const qtx = (Number(newEmissionsRequest.token_total_emissions) / 1000).toFixed(3)
          setQuantity(qtx.toString());
        }

        if (newEmissionsRequest.token_from_date) {
          const tokenFromDate = parseDate(newEmissionsRequest.token_from_date);
          if (tokenFromDate) {
            setFromDate(tokenFromDate);
          }
        }
        if (newEmissionsRequest.token_thru_date) {
          const tokenThruDate = parseDate(newEmissionsRequest.token_thru_date);
          if (tokenThruDate) {
            setThruDate(tokenThruDate);
          }
        }

        if (newEmissionsRequest.token_description) {
            setDescription(newEmissionsRequest.token_description);
        }

        setTokenTypeId(3);
        setError("");
      } else {
        console.warn('Wrong emission_auditor ?', newEmissionsRequest, signedInAddress)
        setError("Wrong emissions auditor address.");
      }
    } catch (error) {
      console.log(error);
      setError("Cannot get emissions request.");
    }
  }, []);

  useEffect(() => {
    async function fetchTrackerDetails() {
      if(!provider){
        return;
      }
      const result = await getTracker(Number(requestedTrackerId));
      console.log(result)
      if (Number(requestedTrackerId)>0 && typeof result === 'object'  ) {
        setAddress(result.tracker?.trackee!)
      }
    }
    fetchTrackerDetails();
  }, [provider, requestedTrackerId, signedInAddress]);


  // update calldata on input change
  useEffect(() => {
    if (signedInAddress) {
      let encodedCalldata;
      const qty = Math.round(Number(quantity) * 1000);
      const fromDateNum = fromDate ? fromDate.getTime()/1000 : null;
      const thruDateNum = thruDate ? thruDate.getTime()/1000 : null;

      try {
        encodedCalldata = encodeParameters(
          // types of params
          [
            'address',
            'uint160',
            'uint8',
            'uint256',
            'uint256',
            'uint256',
            'string',
            'string',
            'string'
          ],
          // value of params
          [
            (limitedMode === true ? adminAddress : address),
            signedInAddress,
            tokenTypeId,
            qty,
            fromDateNum,
            thruDateNum,
            metajson,
            manifestjson,
            ("Issued by DAO. " + description)
          ]
        );
      } catch (error) {
        encodedCalldata = "";
        //console.log(error)
      }
      setCalldata(encodedCalldata);
    }
  }, [
    signedInAddress,
    limitedMode,
    adminAddress,
    address,
    tokenTypeId,
    quantity,
    fromDate,
    thruDate,
    metajson,
    manifestjson,
    description,
  ]);

  useEffect(() => {
    async function fetchAdmin() {
      if (provider) setAdminAddress(await getAdmin(provider));
    }
    if (limitedMode === true) {
      fetchAdmin();
    }
  }, [limitedMode, provider]);

  useEffect(() => {
    if (roles.isAdmin || roles.isRecDealer) {
      setTokenTypeId(1);
    } else if (roles.isAdmin || roles.isCeoDealer) {
      setTokenTypeId(2);
    } else if (roles.isAdmin || roles.isAeDealer) {
      setTokenTypeId(3);
    }
  }, [roles]);

  useEffect(() => {
    const init = async () => {
      if (provider && requestId && signedInAddress) {
        await fetchEmissionsRequest(requestId, signedInAddress);
      }
    }
    init();
  }, [provider, requestId, signedInAddress, fetchEmissionsRequest]);

  async function submit() {
    if (!provider) return;
    if (!fromDate) {
      setResult("Invalid from date");
      return;
    }
    if (!thruDate) {
      setResult("Invalid thru date");
      return;
    }
    // we consider quantity has 3 decimals, multiply by 1000 before passing to the contract
    let quantity_formatted = Math.round(Number(quantity) * 1000);

    const _metadata = castMetadata(metadata);
    const _manifest = castManifest(manifest);
    let result;
    if(Number(requestedTrackerId) >=0){
      result = await issueAndTrack(provider, issuedFrom, address, Number(requestedTrackerId), tokenTypeId, quantity_formatted, fromDate, thruDate, _metadata, _manifest, description, signedInWallet?.has_private_key_on_server);
    }else{
      result = await issue(provider, issuedFrom, address, tokenTypeId, BigInt(quantity_formatted), fromDate, thruDate, _metadata, _manifest, description, signedInWallet?.has_private_key_on_server);
    }
    if (requestId) {
      if (result.toLowerCase().includes("success")) {
        let resultStatus = await issueEmissionsRequest(requestId);
        if (resultStatus && resultStatus.status === 'success') {
          setError("");
          setLocation('/issuedtokens');
        } else {
          setError("Cannot update emissions request status.");
        }
      } else {
        setError("Cannot issue emissions request. " + result.toString());
      }
    }
    setResult(result.toString());
  }

  const inputError = {
    boxShadow: '0 0 0 0.2rem rgba(220,53,69,.5)',
    borderColor: '#dc3545'
  };


  // users that are not using metamask cannot issue tokens
  if (signedInWallet?.has_private_key_on_server) {
    return <MustUseMetamask actionName="issue tokens" />;
  }

  // consumer do not have access to this page
  if (!roles.isAdmin && !roles.hasDealerRole) return <p>You do not have the required role to Issue tokens.</p>

  if (Number(requestedTrackerId) >=0 && !addresses.carbonTracker) return <p>Carbon tracker does not exist.</p>

  return (roles.hasAnyRole && provider!==null) ? (
    <>
      <CreateProposalModal
        show={createModalShow}
        title="Create a proposal"
        onHide={() => {
          setCreateModalShow(false);
        }}
        token={tokenTypeId}
        provider={provider}
        calldata={calldata}
        description={description}
      />

      <SubmissionModal
        show={submissionModalShow}
        title="Issue tokens"
        body={result}
        onHide={() => {setSubmissionModalShow(false); setResult("")} }
      />

      {(requestId) ?
        <>
          <h2>Pending Emissions Request</h2>
          <p className="text-danger">{error}</p>
        </>:
        <>
          <h2>
          Issue tokens
          </h2>
          <p>Issue tokens (Renewable Energy Certificate, Carbon Emissions Offset, Audited Emissions) to registered 
            {Number(requestedTrackerId) >=0 ? 
              ` industry for emissions certificate contract: ${addresses.carbonTracker.address}` 
              : " consumers."
            }
          </p>
        </>
      }
      {Number(requestedTrackerId) >=0 && <>
        <b></b>
        <Form.Group className="mb-3" controlId="trackerIdInput">
          <Form.Label>TrackerId</Form.Label>
          <Form.Control
            type="input"
            placeholder="set to 0 to issue a new tracker"
            value={requestedTrackerId}
            //onChange={onTrackerIdChange}
            disabled
            onBlur={() => setInitializedTrackerIdInput(true)}
            style={(requestedTrackerId! || !initializedTrackerIdInput) ? {} :inputError  }
          />
          <Form.Text className="text-muted">
            Setting ID to 0 will issue a new tracker.
          </Form.Text>
        </Form.Group>
      </>}
      <Form.Group className="mb-3">
        <Form.Label>
          Issue From Address
        </Form.Label>
        { true ?
          <InputGroup>
            <WalletLookupInput
              onChange={(v: string) => { setIssuedFrom(v) }}
              onWalletChange={(w)=>{
                setIssuedFrom(w ? w.address! : '');
              }}
              onBlur={() => setInitializedAddressInput(true)}
              style={(issuedFrom || !initializedAddressInput) ? {} : inputError}
              value={issuedFrom ? issuedFrom : ''}
              />
          </InputGroup>
          :<Form.Control
            type="input"
            value={signedInAddress}
            disabled
          />
        }
      </Form.Group>

      { ((!limitedMode) || (tokenTypeId === 3) || (tokenTypeId === 4))
        ?
        <Form.Group className="mb-3">
          <Form.Label>
            {(Number(requestedTrackerId)>=0) ? "Issue certificate to address" : "Issue to address" }
          </Form.Label>
          {(Number(requestedTrackerId)>0) ?
            <Form.Control
              type="input"
              value={address}
              disabled
            />:
            <InputGroup>
              <WalletLookupInput
                onChange={(v: string) => { setAddress(v) }}
                onWalletChange={(w)=>{
                  setAddress(w ? w.address! : '');
                }}
                onBlur={() => setInitializedAddressInput(true)}
                style={(address || !initializedAddressInput) ? {} : inputError}
                value={address ? address : ''}
                />
            </InputGroup>

          }

          <Form.Text className="text-muted">
            Must be a registered consumer or industry.
          </Form.Text>
        </Form.Group>
        :
        <Form.Group className="mb-3" controlId="addressInput">
          <Form.Label>Address</Form.Label>
          <Form.Control
            type="input"
            value={adminAddress}
            disabled
            onBlur={() => setInitializedAddressInput(true)}
            style={(address || !initializedAddressInput) ? {} : inputError}
          />
          <Form.Text className="text-muted">
            Always set to admin address in limited mode.
          </Form.Text>
        </Form.Group>
      }

      <Form.Group className="mb-3" controlId="tokenTypeInput">
        <Form.Label>Token Type</Form.Label>

       {(selectedPendingEmissions && selectedPendingEmissions.uuid) ?
        <Form.Text className="text-muted">
          <div>{TOKEN_TYPES[tokenTypeId-1]}</div>
        </Form.Text>
       :
         <Form.Select onChange={onTokenTypeIdChange}>
           <option value={0}>{}</option>
           {(roles.isAdmin || roles.isRecDealer) ? <option value={1}>{TOKEN_TYPES[0]}</option> : null}
           {(roles.isAdmin || roles.isCeoDealer) ? <option value={2}>{TOKEN_TYPES[1]}</option> : null}
           {(roles.isAdmin || roles.isAeDealer) ? <option value={3}>{TOKEN_TYPES[2]}</option> : null}
           {/*(roles.isAdmin || roles.isAeDealer) ? <option value={4}>{TOKEN_TYPES[3]}</option> : null*/}
         </Form.Select>
       }
      </Form.Group>

      <Form.Group className="mb-3" controlId="quantityInput">
        <Form.Label>Quantity</Form.Label>
        <Form.Control
          type="input"
          placeholder="0.000"
          value={quantity}
          onChange={onQuantityChange}
          onBlur={() => setInitializedQuantityInput(true)}
          style={(quantity || !initializedQuantityInput) ? {} : inputError}
        />
        {/* Display whether decimal is needed or not */}
        <Form.Text className="text-muted">
          In tons of CO2e. Must not contain more than three decimal values.
        </Form.Text>
      </Form.Group>
      <Row>
        <Form.Group as={Col} className="mb-3" controlId="fromDateInput">
          <Form.Label>From date</Form.Label>
          {/* @ts-ignore : some weird thing with the types ... */}
          <Datetime value={fromDate} onChange={(moment)=>{setFromDate((typeof moment !== 'string') ? moment.toDate() : null)}}/>
        </Form.Group>
        <Form.Group as={Col} className="mb-3" controlId="thruDateInput">
          <Form.Label>Through date</Form.Label>
          {/* @ts-ignore : some weird thing with the types ... */}
          <Datetime value={thruDate} onChange={(moment)=>{setThruDate((typeof moment !== 'string') ? moment.toDate() : null)}}/>
        </Form.Group>
      </Row>
      <Form.Group className="mb-3" controlId="descriptionInput">
        <Form.Label>Description</Form.Label>
        <Form.Control as="textarea" placeholder="" value={description} onChange={onDescriptionChange} />
      </Form.Group>
      <Form.Group className="mb-3" controlId="metadataInput">
        <Form.Label>Metadata</Form.Label>
        <Row>
          <Col md={3}>
            <Row className="mb-3">
              <Form.Label column md={3}>Scope</Form.Label>
              <Col md={9}>
                <Form.Select onChange={onScopeChange}>
                  <option value={0}>{}</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </Form.Select>
              </Col>
            </Row>
          </Col>
          <Col md={7}>
            <Row className="mb-3">
              <Form.Label column md={2}>Type</Form.Label>
              <Col md={10}>
                <Form.Control type="text" placeholder="Type" onChange={onTypeChange} />
              </Col>
            </Row>
          </Col>
          <Col md={2}>
            <Row className="mb-3 g-0 gx-2">
              <Col className="col-md-auto col-6">
                <Button className="w-100" variant="outline-dark" onClick={addField}><BsPlus /></Button>
              </Col>
              <div className="col"></div>
            </Row>
          </Col>
        </Row>
        {FormGroupJSON({keyValuePair: metadata, handles: {setKeyValuePair:setMetadata, addField: addField, removeField: removeField}})}
      </Form.Group>
      <Form.Group>
        <Form.Group>
          <Form.Label>Manifest</Form.Label>
          <Button className="label-button" variant="outline-dark" onClick={addFieldManifest}><BsPlus /></Button>
        </Form.Group>
        {FormGroupJSON({keyValuePair: manifest!, handles: {setKeyValuePair:setManifest, addField: addFieldManifest, removeField: removeFieldManifest}})}
      </Form.Group>

      <Row className="mt-4">
        <Col>

          {/* if in limited mode, require dealer role (except AE & CarbonTacker) to make a DAO proposal */}
          { (limitedMode && (!roles.isAdmin && !roles.isRecDealer && !roles.isCeoDealer))
            ?
            <Button
              variant="success"
              size="lg"
              className="w-100"
              disabled={true}
            >
              Must be a registered dealer
            </Button>
            :
            <>
            {(selectedPendingEmissions && selectedPendingEmissions.uuid) ?
              <AsyncButton
                className="w-100"
                variant="danger"
                onClick={()=>{ declineQuery.mutate() }}
                loading={declineQuery.isLoading}
              >Decline</AsyncButton> :
              <Button
                variant="success"
                size="lg"
                className="w-100"
                onClick={() => setCreateModalShow(true)}
                disabled={
                  (calldata.length === 0) ||
                  Number(quantity) === 0 ||
                  tokenTypeId === 3
                }
              >
                Create a DAO proposal token
              </Button>
            }
            </>
          }

        </Col>

        { ( !limitedMode || tokenTypeId === 3 ) &&
          <Col>
            {/* Only enable issue if any role is found */}
            { roles.hasAnyRole
              ?
                <Button
                  variant="primary"
                  size="lg"
                  className="w-100"
                  onClick={handleSubmit}
                  disabled={disableIssueButton(calldata, quantity, address, requestId)}>
                  Issue
                </Button>
              :
                <Button variant="primary" size="lg" disabled>Must be a registered dealer</Button>
            }
          </Col>
        }

      </Row>

    </>
  ) : (
    <p>You must be a registered dealer to issue tokens.</p>
  );
}

export default IssueForm;
