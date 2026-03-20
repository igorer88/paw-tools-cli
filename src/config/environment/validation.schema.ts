import Joi from 'joi';

import { Environment } from '../enums';

export const getValidationSchema = (): Joi.ObjectSchema => {
  return Joi.object({
    NODE_ENV: Joi.string()
      .default(Environment.Development)
      .valid(Environment.Development, Environment.Production, Environment.Test),
    DEBUG: Joi.boolean().default(false),
    APP_SECRET_KEY: Joi.string().min(32),
    APP_LOGGER_LEVELS: Joi.string().default('log,error,warn,debug,verbose,fatal'),
  }).unknown(true);
};
