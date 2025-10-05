import dotenv from 'dotenv';

dotenv.config();

export const SENDER_ADDRESS = process.env.SENDER_ADDRESS;
if (!SENDER_ADDRESS) {
  throw new Error('SENDER_ADDRESS is required');
}

export const SOLVER_ADDRESS = process.env.SOLVER_ADDRESS;
if (!SOLVER_ADDRESS) {
  throw new Error('SOLVER_ADDRESS is required');
}

export const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;
if (!RECIPIENT_ADDRESS) {
  throw new Error('RECIPIENT_ADDRESS is required');
}

export const SENDER_PK = process.env.SENDER_PK;
if (!SENDER_PK) {
  throw new Error('SENDER_PK is required');
}

export const SOLVER_PK = process.env.SOLVER_PK;
if (!SOLVER_PK) {
  throw new Error('SOLVER_PK is required');
}

export const INTOKEN_ADDRESS = process.env.INTOKEN_ADDRESS;
if (!INTOKEN_ADDRESS) {
  throw new Error('INTOKEN_ADDRESS is required');
}

export const OUTTOKEN_ADDRESS = process.env.OUTTOKEN_ADDRESS;
if (!OUTTOKEN_ADDRESS) {
  throw new Error('OUTTOKEN_ADDRESS is required');
}

export const ORIGIN_ROUTER_ADDRESS = process.env.ORIGIN_ROUTER_ADDRESS;
if (!ORIGIN_ROUTER_ADDRESS) {
  throw new Error('ORIGIN_ROUTER_ADDRESS is required');
}

export const DESTINATION_ROUTER_ADDRESS =
  process.env.DESTINATION_ROUTER_ADDRESS;
if (!DESTINATION_ROUTER_ADDRESS) {
  throw new Error('DESTINATION_ROUTER_ADDRESS is required');
}

export const ORIGIN_LATTEPOOL_ADDRESS = process.env.ORIGIN_LATTEPOOL_ADDRESS;
if (!ORIGIN_LATTEPOOL_ADDRESS) {
  throw new Error('ORIGIN_LATTEPOOL_ADDRESS is required');
}

export const DESTINATION_LATTEPOOL_ADDRESS =
  process.env.DESTINATION_LATTEPOOL_ADDRESS;
if (!DESTINATION_LATTEPOOL_ADDRESS) {
  throw new Error('DESTINATION_LATTEPOOL_ADDRESS is required');
}

export const ORIGIN_SWAPROUTER_ADDRESS = process.env.ORIGIN_SWAPROUTER_ADDRESS;
if (!ORIGIN_SWAPROUTER_ADDRESS) {
  throw new Error('ORIGIN_SWAPROUTER_ADDRESS is required');
}

export const DESTINATION_SWAPROUTER_ADDRESS =
  process.env.DESTINATION_SWAPROUTER_ADDRESS;
if (!DESTINATION_SWAPROUTER_ADDRESS) {
  throw new Error('DESTINATION_SWAPROUTER_ADDRESS is required');
}

export const ORIGIN_DOMAIN = Number(process.env.ORIGIN_DOMAIN);
if (!ORIGIN_DOMAIN) {
  throw new Error('ORIGIN_DOMAIN is required');
}

export const DESTINATION_DOMAIN = Number(process.env.DESTINATION_DOMAIN);
if (!DESTINATION_DOMAIN) {
  throw new Error('DESTINATION_DOMAIN is required');
}

export const SEQUENCER_API_URL = process.env.SEQUENCER_API_URL;
if (!SEQUENCER_API_URL) {
  throw new Error('SEQUENCER_API_URL is required');
}

export const PERMIT2_ADDRESS = process.env.PERMIT2_ADDRESS;
if (!PERMIT2_ADDRESS) {
  throw new Error('PERMIT2_ADDRESS is required');
}
