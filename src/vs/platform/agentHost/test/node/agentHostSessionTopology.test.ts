/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IAgentHostGitService } from '../../common/agentHostGitService.js';
import { classifySessionTopology, resolveSessionTopology } from '../../node/agentHostSessionTopology.js';
import { createNoopGitService } from '../common/sessionTestHelpers.js';

/**
 * Builds a typed {@link IAgentHostGitService} fake whose `getRepositoryRoot`
 * returns a canned repository root per working directory (keyed by URI string),
 * `undefined` for a directory absent from the map (non-git), and throws for a
 * directory present in `failing`.
 */
function createFakeGitService(repositoryRoots: ReadonlyMap<string, URI>, failing?: ReadonlySet<string>): IAgentHostGitService {
	return {
		...createNoopGitService(),
		getRepositoryRoot: async (workingDirectory: URI) => {
			if (failing?.has(workingDirectory.toString())) {
				throw new Error('git spawn failed');
			}
			return repositoryRoots.get(workingDirectory.toString());
		},
	};
}

suite('agentHostSessionTopology', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('classifySessionTopology reconciles folder counts', () => {
		assert.deepStrictEqual(classifySessionTopology(3, 1, 1), {
			folderCount: 3,
			gitBackedFolderCount: 2,
			uniqueGitRepoCount: 1,
			nonGitFolderCount: 1,
			isMultiRoot: true,
		});
	});

	test('classifySessionTopology treats a single folder as single-root', () => {
		assert.deepStrictEqual(classifySessionTopology(1, 0, 1), {
			folderCount: 1,
			gitBackedFolderCount: 1,
			uniqueGitRepoCount: 1,
			nonGitFolderCount: 0,
			isMultiRoot: false,
		});
	});

	test('resolveSessionTopology dedupes shared repos and reconciles counts', async () => {
		const repositoryRoot = URI.file('/repos/app');
		const primaryDirectory = URI.file('/repos/app');
		const subdirectory = URI.file('/repos/app/packages/web');
		const nonGitDirectory = URI.file('/tmp/scratch');
		const gitService = createFakeGitService(new Map([
			[primaryDirectory.toString(), repositoryRoot],
			[subdirectory.toString(), repositoryRoot],
		]));

		const { topology, repositories } = await resolveSessionTopology(
			[primaryDirectory.toString(), subdirectory.toString(), nonGitDirectory.toString()],
			gitService,
		);

		assert.deepStrictEqual({ topology, repositories }, {
			topology: {
				folderCount: 3,
				gitBackedFolderCount: 2,
				uniqueGitRepoCount: 1,
				nonGitFolderCount: 1,
				isMultiRoot: true,
			},
			repositories: {
				gitRepositories: [repositoryRoot],
				nonGitDirectories: [nonGitDirectory],
			},
		});
	});

	test('resolveSessionTopology counts probe failures and unparseable paths as non-git', async () => {
		const repositoryRoot = URI.file('/repos/one');
		const gitDirectory = URI.file('/repos/one');
		const failingDirectory = URI.file('/repos/broken');
		const gitService = createFakeGitService(
			new Map([[gitDirectory.toString(), repositoryRoot]]),
			new Set([failingDirectory.toString()]),
		);

		const reported: string[] = [];
		const { topology, repositories } = await resolveSessionTopology(
			// The last entry has an illegal scheme, so `URI.parse` throws and it
			// is counted as non-git.
			[gitDirectory.toString(), failingDirectory.toString(), 'foo bar:baz'],
			gitService,
			directory => reported.push(directory),
		);

		assert.deepStrictEqual({ topology, gitRepositories: repositories.gitRepositories, reportedCount: reported.length }, {
			topology: {
				folderCount: 3,
				gitBackedFolderCount: 1,
				uniqueGitRepoCount: 1,
				nonGitFolderCount: 2,
				isMultiRoot: true,
			},
			gitRepositories: [repositoryRoot],
			reportedCount: 2,
		});
	});
});
