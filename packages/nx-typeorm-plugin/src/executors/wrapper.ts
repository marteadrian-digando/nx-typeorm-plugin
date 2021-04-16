import {
  Executor,
  ExecutorContext,
  ProjectConfiguration,
  TargetConfiguration,
  WorkspaceJsonConfiguration
} from '@nrwl/devkit';
import path from 'path';

import { logger, LoggerOptions } from '../logger';
import { TypeormProject } from '../typeorm-project';

// Context
export class TypeormExecutorContext implements ExecutorContext {
  // Attributes
  root: string;
  projectName?: string;
  targetName?: string;
  configurationName?: string;
  target?: TargetConfiguration;
  workspace: WorkspaceJsonConfiguration;
  cwd: string;
  isVerbose: boolean;

  // Constructor
  constructor(context: ExecutorContext) {
    Object.assign(this, context);
  }

  // Properties
  get project(): ProjectConfiguration  {
    if (!this.projectName) {
      throw new Error('Missing projectName in context');
    }

    return this.workspace.projects[this.projectName];
  }

  get typeormProject(): TypeormProject {
    return new TypeormProject(path.resolve(this.root, this.project.root));
  }
}

// Wrapper
export type TypeormExecutor<O> = (options: O, context: TypeormExecutorContext) => ReturnType<Executor<O>>

export function typeormExecutor<O extends Partial<LoggerOptions>>(executor: TypeormExecutor<O>): Executor<O> {
  return function (options: O, context: ExecutorContext): ReturnType<Executor<O>> {
    // Setup logger
    logger.setOptions({
      verbosity: options.verbosity
    });

    // Run executor
    const result = executor(options, new TypeormExecutorContext(context));

    if (result instanceof Promise) {
      return (async function () {
        try {
          return await result;
        } catch (error) {
          logger.stop();
          logger.error(error);

          return { success: false };
        } finally {
          logger.stop();
        }
      })();
    } else {
      return (async function* () {
        try {
          for await (const res of result) {
            yield res;
          }
        } catch (error) {
          logger.stop();
          logger.error(error);

          return { success: false };
        } finally {
          logger.stop();
        }
      })();
    }
  }
}
