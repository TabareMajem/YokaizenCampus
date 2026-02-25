
import { COMMON } from './common';
import { AUTH } from './auth';
import { AGENT } from './agent';
import { GAME } from './game';
import { GAME_COMMON } from './game_common';
import { SQUAD } from './squad';
import { TOOL } from './tool';

export const CA = {
    ...COMMON,
    ...AUTH,
    ...AGENT,
    ...GAME,
    ...GAME_COMMON,
    ...SQUAD,
    ...TOOL,
};
