import { TrackerStatus } from '@blockchain-carbon-accounting/data-postgres'

export type FieldOp = '=' | '>' | '>=' | '<' | '<=' | '!=' | 'contains'
export type FieldOpValue = 'eq' | 'gt' | 'gte' | 'ls' | 'lte' | 'neq' | 'like'
export type FieldType = 'string' | 'number' | 'balance' | 'enum'

export type Field = {
  ops?: string[]
  op?: FieldOp 
  alias?: string
  value?: string | number
  name?: string
  type?: FieldType 
}

export type Wallet = {
  name?: string
  address?: string
  email?: string
  password?: string
  organization?: string
  roles?: string
  public_key?: string
  has_private_key_on_server?: boolean
  public_key_name?: string
  metamask_encrypted_public_key?: string
}

export type Token = {
  tokenId: number
  tokenTypeId: number
  tokenType?: string
  trackerId?: number
  issuedBy: string
  issuedFrom: string
  issuedTo: string
  fromDate?: number
  thruDate?: number
  dateCreated?: number
  // eslint-disable-next-line
  metadata: Object
  manifest: Object
  description: string
  totalIssued?: bigint // bigint
  totalRetired?: bigint // bigint
  scope: number
  type: string
  isMyIssuedToken?: boolean
}
//export interface Tracker extends TrackerPayload {
// TO-DO use extends for object like type from /data-postgres/common
export type Tracker = {
  trackerId: number
  tokenId: number
  trackee: string
  issuedFrom: string
  issuedBy: string
  fromDate?: number
  thruDate?: number
  metadata: Object
  manifest: Object
  dateCreated: number
  dateUpdated?: number
  dateIssued?: number
  totalProductAmounts: bigint
  totalEmissions: number
  totalOffsets: number
  totalREC: number
  emissionsFactor?: number
  myProductsTotalEmissions?: number
  products?: ProductToken[]
  trackedProducts?: TrackedProduct[]
  tokens?: TrackedToken[]
}

export type TrackedProduct = {
  product: ProductToken
  productId:number
  trackerId: number
  amount: bigint
}

export type TrackedToken = {
  token: Token
  tokenId: number
  trackerId: number
  amount: bigint
}

export type ProductToken = {
  tokenId: number
  productId: number
  trackerId: number
  issuedFrom: string
  issuedBy: string
  issued: bigint
  available: bigint
  retired: bigint
  dateCreated: number
  dateUpdated?: number
  balances?: ProductTokenBalance[]
  emissionsFactor?: number
  unit?: string
  unitAmount: number
  unitAvailable?: number
  unitConversion?: number
  name?: string
  tracker: Tracker
  metadata: Object
  manifest: Object
}

export type Balance = {
  issuedTo: string
  tokenId: number
  available: bigint // bigint
  retired: bigint // bigint
  transferred: bigint // bigint
  token: Token
  tokenType?: string
  availableBalance?: bigint
  retiredBalance?: bigint
  transferredBalance?: bigint
}

export type ProductTokenBalance = {
  issuedTo: string
  productId: number
  available: bigint // bigint
  retired: bigint // bigint
  transferred: bigint // bigint
  product: ProductToken
  unitConversion?: number
  unitAvailable?:number
  availableBalance?: bigint
  retiredBalance?: bigint
  transferredBalance?: bigint
}

export type TrackerBalance = {
  issuedTo: string
  trackerId: number
  status: TrackerStatus
  tracker: Tracker
}

export type Operator = {
  uuid?: string;
  name?: string;
  wallet_address?: string;
  status?: string;
  description?: string;
  asset_count?: number;
  trackersCount?: number;
  assetsCount?:number;
  //asset_operators?: AssetOperator[];
  //products?: Product[];
}

export type Proposal = {
  id: number
  realId: number
  details: {
    proposer: string
    forVotes: number
    againstVotes: number
    rawForVotes: number
    rawAgainstVotes: number
    startBlock: number
    endBlock: number
  }
  state: string
  actions: any
  receipt: {
    hasVoted: boolean
    hasVotesRefunded: boolean
    support: boolean
    votes: number
    rawVotes: number
    rawRefund: number
    endVotesCancelPeriodBlock: number
  }
  description: string
  isEligibleToVote: boolean
}

export type RolesInfo = {
  isAdmin?: boolean
  isConsumer?: boolean
  isRecDealer?: boolean
  isCeoDealer?: boolean
  isAeDealer?: boolean
  isIndustry?: boolean
  hasAnyRole?: boolean
  hasIndustryRole?: boolean
  hasDealerRole?: boolean
}

export type Role = 'None' | 'Owner' | 'Consumer' | 'REC Dealer' | 'Offset Dealer' | 'Emissions Auditor' | 'Industry' | 'Industry Dealer'

export const RoleEnum = {
  /** Empty role */
  None: 'None',
  /** Owner role, aka: Admin */
  Owner: 'Owner',
  /** Consumer role */
  Consumer: 'Consumer',
  /** REC Dealer role, aka: REC */
  RecDealer: 'REC Dealer',
  /** Offset Dealer role, aka: CEO */
  OffsetDealer: 'Offset Dealer',
  /** Emissions Auditor role. aka: AE */
  EmissionsAuditor: 'Emissions Auditor',
  /** Industry role, aka: REGISTERED_INDUSTRY */
  Industry: 'Industry'
} as const

export const rolesInfoToArray = (roles: RolesInfo|null): Role[] => {
  const res: Role[] = [];
  if (!roles) return res;
  if (roles.isAdmin) res.push(RoleEnum.Owner);
  if (roles.isConsumer) res.push(RoleEnum.Consumer);
  if (roles.isRecDealer) res.push(RoleEnum.RecDealer);
  if (roles.isCeoDealer) res.push(RoleEnum.OffsetDealer);
  if (roles.isAeDealer) res.push(RoleEnum.EmissionsAuditor);
  if (roles.isIndustry) res.push(RoleEnum.Industry);
  return res;
}

export const OPERATORS: Record<FieldType, FieldOp[]> = {
    'string': ["=", "contains"],
    'number': [">", "<", "="],
    'balance': [">", "<", "="],
    'enum': ["="]
}

export const FIELD_OPS: {label: FieldOp, value: FieldOpValue}[] = [
    { label: "=", value: "eq" },
    { label: ">", value: "gt" },
    { label: ">=", value: "gte" },
    { label: "<", value: "ls" },
    { label: "<=", value: "lte" },
    { label: "!=", value: "neq" },
    { label: "contains", value: "like" },
];

export const TOKEN_TYPES = [
    "Renewable Energy Certificate",
    "Carbon Emissions Offset",
    "Audited Emissions",
    //"Carbon Tracker"
  ];

export const BALANCE_FIELDS: Field[] = [
{
    alias: 'Token Type',
    name: 'tokenTypeId',
    type: 'enum'
},
{
    alias: 'Balance',
    name: 'available',
    type: 'balance'
},
{
    alias: 'Retired',
    name: 'retired',
    type: 'balance'
},
{
    alias: 'Transferred',
    name: 'transferred',
    type: 'balance'
},
{
    alias: 'Scope',
    name: 'scope',
    type: 'number'
},
{
    alias: 'Type',
    name: 'type',
    type: 'string'
},
]

export const TOKEN_FIELDS: Field[] = [
{
    alias: 'Token Type',
    name: 'tokenTypeId',
    type: 'enum'
},
{
    alias: 'Total Issued',
    name: 'totalIssued',
    type: 'balance'
},
{
    alias: 'Total Retired',
    name: 'totalRetired',
    type: 'balance'
},
{
    alias: 'Transferred',
    name: 'transferred',
    type: 'balance'
},
{
    alias: 'Scope',
    name: 'scope',
    type: 'number'
},
{
    alias: 'Type',
    name: 'type',
    type: 'string'
},
]
