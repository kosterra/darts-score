import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/training/x01';

/**
 * X01 trainings against the bot: the same calls as the games, so the X01
 * game page plays them too, plus the trainings of a player.
 */
const createX01Game = (game) => requestJSON(API_URL, { method: 'POST', body: game });
const loadX01GameById = (id) => requestJSON(`${API_URL}/${id}`);
const updateX01Game = (game) => requestJSON(`${API_URL}/${game.id}`, { method: 'PUT', body: game });
const loadTrainings = (playerId) => requestJSON(`${API_URL}?player=${encodeURIComponent(playerId)}`);
// the charts of a training, as for a game
const loadX01GameStats = (id) => requestJSON(`${API_URL}/${id}/stats`);
const deleteTraining = (id) => requestJSON(`${API_URL}/${id}`, { method: 'DELETE' });

const X01TrainingService = { loadX01GameStats, createX01Game, loadX01GameById, updateX01Game, loadTrainings, deleteTraining };

export default X01TrainingService;
