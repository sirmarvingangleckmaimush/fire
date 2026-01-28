
export interface SimulationResult {
  timestamp: number;
  co2Level: number;
  dustDensity: number;
  efficiency: number;
  entropy: number;
}

export interface SequestrationBlock {
  id: string;
  hash: string;
  carbonSaved: number;
  method: CollectionMethod;
  timestamp: number;
}

export interface SequestrationTransaction {
  txid: string;
  raw: string;
  signature: string;
  isSigned: boolean;
  amount: number;
  timestamp: number;
}

export interface VaultState {
  address: string;
  wif: string;
  totalBalance: number;
  lastConsolidation: number;
  isRecovering: boolean;
  isWifValid: boolean;
}

export interface VeritasMath {
  sqrtValue: number;
  fibValue: number;
  status: string;
}

export enum CollectionMethod {
  ORDINAL = 'ORDINAL',
  STOCHASTIC_FLUX = 'STOCHASTIC_FLUX'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface GroundingMetadata {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}
