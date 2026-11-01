/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleApiNicheRequest } from '../lib/nicheHandler.ts';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  return handleApiNicheRequest(req, res);
}
