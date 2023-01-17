// SPDX-License-Identifier: Apache-2.0
import { FC, useEffect, useState, useCallback } from "react";
import { Form } from "react-bootstrap";
import Table from "react-bootstrap/Table";

import { EmissionsFactorForm, defaultEmissionsFactorForm } from "@blockchain-carbon-accounting/react-app/src/pages/request-audit"
import { FormSelectRow, FormInputRow } from "@blockchain-carbon-accounting/react-app/src/components/forms-util";
import ErrorAlert from "@blockchain-carbon-accounting/react-app/src/components/error-alert";
import SuccessAlert from "@blockchain-carbon-accounting/react-app/src/components/success-alert";
import AsyncButton from "@blockchain-carbon-accounting/react-app/src/components/AsyncButton";
import { createEmissionsRequest, calculateEmissionsRequest } from "@blockchain-carbon-accounting/react-app/src/services/api.service";
import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";

import { Product } from "../components/static-data";
import { Tracker,RolesInfo } from "@blockchain-carbon-accounting/react-app/src/components/static-data";

import { 
  ActivityType, 
  emissionsTypes,
  ghgTypes,
  Emissions,
  ActivityResult
} from "@blockchain-carbon-accounting/supply-chain-lib/src/common-types"


type RequestAuditProps = {
  provider?:Web3Provider | JsonRpcProvider
  signedInAddress?: string
  issuedFrom: string
  tracker?: Tracker
  product:Product
  roles: RolesInfo
  onHide:()=>void 
  onSubmitHandle:(activityResult:ActivityResult)=>void
}

type SuccessResultType = {
  emissions: Emissions,
  title?: string
}

type EmissionsFactorFormErrors = Partial<EmissionsFactorForm>&{supportingDoc?:string, hasErrors?: boolean}

const RequestProductAudit:FC<RequestAuditProps> = (
  {signedInAddress,issuedFrom,tracker,product,roles,onSubmitHandle}
) => {
  let seededEmForm = defaultEmissionsFactorForm;
  const formKeys = Object.keys(defaultEmissionsFactorForm)
  for(const productKey of Object.keys(product)){
    if(formKeys.includes(productKey) && product[productKey]){
      seededEmForm[productKey]=product[productKey];
    }
  } 
  //seededEmForm = {...seededEmForm,...{product as any}};
  seededEmForm['issued_from'] = issuedFrom;
  seededEmForm['activity_type'] = 'industry' as ActivityType;
  seededEmForm['activity_amount'] = product.amount.toString();
  seededEmForm['activity_uom'] = product.unit;
  seededEmForm['emission_name'] = product.name;
  seededEmForm['gwp'] = '1'

  switch(product.name.toLowerCase()){
    case 'co2' :
      seededEmForm['ghg_type'] = 'CO2'
      break
    case 'co2e' :
      seededEmForm['ghg_type'] = 'CO2e'
      break
    case 'n2o' :
      seededEmForm['ghg_type'] = 'N2O'
      seededEmForm['gwp'] = '265'
      break
    case 'ch4' :
      seededEmForm['ghg_type'] = 'CH4'
      seededEmForm['gwp'] = '28'
      break
    default :
      seededEmForm['ghg_type'] = 'other'
      break
  }

  const metadata = product.metadata ? JSON.parse(product?.metadata) : {}
  if(metadata.gwp){seededEmForm['gwp'] = metadata['gwp']};
  const industryEmFormSeededKeys = [ 'issued_from','issued_to', 'activity_type', 'activity_amount', 'country', 'division_type', 'division_name', 'sub_division_type', 'sub_division_name', 'latitude', 'longitude'];
  const [emForm, setEmForm] = useState<EmissionsFactorForm>(seededEmForm)
  
  const utf8Encode = new TextEncoder();
  const byteArray = utf8Encode.encode(JSON.stringify(product));
  const supportingDoc = new File([byteArray],`product_uuid_${product.uuid}`)
  const [validated, setValidated] = useState(false)
  const formErrors:EmissionsFactorFormErrors={};
  const [topError, setTopError] = useState('')
  const [topSuccess, setTopSuccess] = useState<SuccessResultType|null>(null)
  const [loading, setLoading] = useState(false);
  const [selectedGWP, setSelectedGWP] = useState(seededEmForm['gwp'])

//  const [fromDate, setFromDate] = useState<Date|null>(null);
//  const [thruDate, setThruDate] = useState<Date|null>(null);

  const  setEmFormGWP = useCallback( (value) =>{
    switch(value.toLowerCase()){
      case 'co2': 
        emForm['gwp'] = '1'
        break
      case 'co2e':
        emForm['gwp'] = '1.0'
        break
      case 'other':
        emForm['gwp'] = '1.00'
        break
      case 'n2o' :
        emForm['gwp'] = '265'
        break
      case 'ch4' :
        emForm['gwp'] = '28'
        break
      default :
        emForm['gwp'] = '1.000'
    }
    emForm['ghg_type']=value;
    setEmForm(emForm)
    setSelectedGWP(emForm['gwp'])
  },[emForm,setEmForm,setSelectedGWP])

  useEffect(()=>{
  }, [])

  // Form submit
  const handleSubmit = async(e:any)=>{
    // always stop the event as we handle all in this function
    e.preventDefault()
    e.stopPropagation()
    const form = e.currentTarget
    let valid = true
    if (form.checkValidity() === false) {
      valid = false
    }
    // mark the form to render validation errors
    setValidated(true)
    setTopError('')
    setTopSuccess(null)
    if (valid) {
      setLoading(true)
      console.log('Form valid, submit with', emForm, supportingDoc)
      try {
        // registered users will create an emissions request, non-registered users will just
        // get the calculated emissions
        console.log(emForm)
        const res = roles.isAeDealer ?
          await calculateEmissionsRequest(emForm, product.from_date!, product.thru_date!) :
          await createEmissionsRequest(emForm, supportingDoc!, signedInAddress!, product.from_date!, product.thru_date!, tracker ? tracker.trackerId : 0)
        console.log('Form results ', res)
        const emissions = res?.result?.emissions
        if (signedInAddress) {
          setTopSuccess({emissions})
          // remove the saved emissions request
          localStorage.removeItem('emissionsRequest')
        } else {
          // save the request in local storage so we can restore it after the user signs in
          setTopSuccess({ emissions, title: 'Emissions calculated' })
        }
        if(roles.isAeDealer){
          onSubmitHandle(res?.result)
        }
      } catch (err) {
        console.warn('Form error ', err)
        setTopError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    } else {
      console.log('Form invalid, check errors:', formErrors)
    }
  }

  return (
    <>
      <h3 style={{display: 'inline'}}>{`Emissions certificate request: \n ${(tracker?.metadata as any)?.description}`}</h3>
      <Table hover size="sm">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>

        <tbody>
          <tr><td>From</td><td>{product.from_date?.toLocaleString('en-US')}</td></tr>
          <tr><td>From</td><td>{product.thru_date?.toLocaleString('en-US')}</td></tr>
          {industryEmFormSeededKeys.map((key) => (
            emForm[key] &&
            <tr key={key}>
              <td>{key}</td>
              <td>{emForm[key]}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Form
        onSubmit={handleSubmit}
        noValidate validated={validated}>
        {/*<FormInputRow form={emForm} setForm={setEmForm} field="activity_amount" type="number" min={0} step="any" label={`Activity amount`} required errors={formErrors} disabled={!!topSuccess} />*/}
        <FormInputRow form={emForm} setForm={setEmForm} field="activity_uom" type="input" label={`Activity uom`} required errors={formErrors} disabled={!!topSuccess}/>

        <FormSelectRow form={emForm} setForm={setEmForm} errors={formErrors} field="emissions_type" label="Emissions Type" disabled={!!topSuccess}
          values={emissionsTypes.map(e => {return {value: e, label: e}})}
        />
        <FormSelectRow form={emForm} setForm={setEmForm} errors={formErrors} field="ghg_type" label="GHG Type" disabled={!!topSuccess}
          values={ghgTypes.map(e => {return {value: e, label: e}})} onChange={(value)=>{setEmFormGWP(value)}}
        />
        {selectedGWP && <FormInputRow form={emForm} setForm={setEmForm} field="gwp" type="number" min={0} step="any" label={`Global warming potential in CO2e`} required errors={formErrors} disabled={!!topSuccess}/>}

        {topError && <ErrorAlert error={topError} onDismiss={()=>{}} />}

        {topSuccess ? <>
          <SuccessAlert title={topSuccess.title || "Request Submitted Successfully"} onDismiss={()=>{}}>
            <div>Calculated emissions: {topSuccess.emissions?.amount.value?.toLocaleString('en-US')} {topSuccess.emissions?.amount?.unit}{topSuccess.emissions?.amount?.unit?.endsWith('CO2e')?'':'CO2e'}</div>
          </SuccessAlert>
          </> :
            <AsyncButton
              className="w-100"
              variant="success"
              loading={loading}
              type="submit"
            >{ roles.isAeDealer ? "Calculate Emissions": "Request Audit" }</AsyncButton>
        } 
      </Form>
    </>
  )
}

export default RequestProductAudit;