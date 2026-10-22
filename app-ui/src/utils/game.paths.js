import { gameOf } from '../rules/games';

// Shanghai, Killer, … : the games of the rules engine, typed by their kind
export const isRulesKind = (type) => Boolean(gameOf(type));

// where a running game goes on
export const playPath = (type, id) => (isRulesKind(type) ? `/play/${type}/${id}` : `/${type}/${id}`);
