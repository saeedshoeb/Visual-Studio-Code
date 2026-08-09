/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../base/common/uri.js';
import { IAgentHostGitService } from '../common/agentHostGitService.js';
import { ISessionRepositories, resolveSessionRepositories } from './agentHostSessionRepositories.js';

/**
 * The reconcilable git/non-git shape of a session's effective working
 * directories, used for telemetry. `folderCount === gitBackedFolderCount +
 * nonGitFolderCount`, while `uniqueGitRepoCount` deduplicates folders that share
 * a repository, so `uniqueGitRepoCount <= gitBackedFolderCount`.
 */
export interface ISessionTopology {
	/** Total effective working directories (multi-root when > 1). */
	readonly folderCount: number;
	/** Folders backed by a git repository (pre-deduplication). */
	readonly gitBackedFolderCount: number;
	/** Unique git repositories the git-backed folders resolve to. */
	readonly uniqueGitRepoCount: number;
	/** Folders that are not git-backed (including unparseable paths). */
	readonly nonGitFolderCount: number;
	/** Whether the session spans more than one folder. */
	readonly isMultiRoot: boolean;
}

/**
 * Derives the reconcilable {@link ISessionTopology} from already-resolved
 * counts. Pure so the reconciliation invariant is unit-testable; callers pass
 * `nonGitFolderCount <= folderCount`.
 */
export function classifySessionTopology(folderCount: number, nonGitFolderCount: number, uniqueGitRepoCount: number): ISessionTopology {
	return {
		folderCount,
		gitBackedFolderCount: folderCount - nonGitFolderCount,
		uniqueGitRepoCount,
		nonGitFolderCount,
		isMultiRoot: folderCount > 1,
	};
}

/** The {@link ISessionTopology} plus the resolved repositories that produced it. */
export interface IResolvedSessionTopology {
	readonly topology: ISessionTopology;
	/**
	 * The git/non-git split of the parseable directories, so a caller that also
	 * needs to fan out per repository (e.g. the per-turn diff) reuses this result
	 * instead of probing git again.
	 */
	readonly repositories: ISessionRepositories;
}

/**
 * Probes a session's effective working directories into their git/non-git split
 * and derives the reconcilable {@link ISessionTopology}. A path that cannot be
 * parsed or whose repository-root lookup fails counts as a non-git folder, so
 * `folderCount` always equals the number of inputs.
 *
 * @param onDirectoryError invoked for each parse or repository-root lookup
 * failure (the directory is still counted as non-git).
 */
export async function resolveSessionTopology(
	workingDirectories: readonly string[],
	gitService: IAgentHostGitService,
	onDirectoryError?: (directory: string, error: unknown) => void,
): Promise<IResolvedSessionTopology> {
	const folderCount = workingDirectories.length;
	const parsedUris: URI[] = [];
	let unparseableCount = 0;
	for (const workingDirectory of workingDirectories) {
		try {
			parsedUris.push(URI.parse(workingDirectory));
		} catch (err) {
			unparseableCount++;
			onDirectoryError?.(workingDirectory, err);
		}
	}

	const repositories = await resolveSessionRepositories(parsedUris, gitService, (directory, error) => onDirectoryError?.(directory.toString(), error));
	const nonGitFolderCount = repositories.nonGitDirectories.length + unparseableCount;
	const topology = classifySessionTopology(folderCount, nonGitFolderCount, repositories.gitRepositories.length);
	return { topology, repositories };
}
