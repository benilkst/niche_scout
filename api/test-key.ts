/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleApiTestKeyRequest } from '../lib/nicheHandler.ts';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  return handleApiTestKeyRequest(req, res);
}
