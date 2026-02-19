
import { COMMON } from './common';
import { AUTH } from './auth';
import { AGENT } from './agent';
import { GAME } from './game';
import { SQUAD } from './squad';
import { TOOL } from './tool';

export const KO = {
    ...COMMON,
    ...AUTH,
    ...AGENT,
    ...GAME,
    ...SQUAD,
    ...TOOL,
};
