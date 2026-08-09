/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ITelemetryService } from '../../telemetry/common/telemetry.js';
import type { ISessionTopology } from './agentHostSessionTopology.js';

/**
 * How a session was created:
 * - `user`: a plain user-initiated create.
 * - `fork`: forked from an existing session.
 * - `import`: created by importing a conversation.
 * - `agentTool`: created by the `create_session` server tool (a subagent/tool).
 */
export type AgentHostSessionSource = 'user' | 'fork' | 'import' | 'agentTool';

export interface IAgentHostSessionCreatedData {
	readonly provider: string;
	readonly source: AgentHostSessionSource;
	readonly folderCount: number;
	readonly isMultiRoot: boolean;
	readonly isProvisional: boolean;
}

type AgentHostSessionCreatedEvent = {
	provider: string;
	source: string;
	folderCount: number;
	isMultiRoot: boolean;
	isProvisional: boolean;
};

type AgentHostSessionCreatedClassification = {
	provider: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The agent provider handling the session.' };
	source: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'How the session was created (user, fork, import, or agentTool).' };
	folderCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of requested working directories at create time (post capability truncation; may differ from the materialized count).' };
	isMultiRoot: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Whether the session was created spanning more than one working directory.' };
	isProvisional: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Whether the session was created provisionally (materialized later on first message).' };
	owner: 'DonJayamanne';
	comment: 'Tracks agent host session creation, including how the session was created and its initial multi-root shape.';
};

export function reportAgentHostSessionCreated(telemetryService: ITelemetryService, data: IAgentHostSessionCreatedData): void {
	telemetryService.publicLog2<AgentHostSessionCreatedEvent, AgentHostSessionCreatedClassification>('agentHost.sessionCreated', {
		provider: data.provider,
		source: data.source,
		folderCount: data.folderCount,
		isMultiRoot: data.isMultiRoot,
		isProvisional: data.isProvisional,
	});
}

export interface IAgentHostSessionMaterializedData {
	readonly provider: string;
	readonly source: AgentHostSessionSource;
	readonly wasProvisional: boolean;
	readonly topology: ISessionTopology;
	/** Wall-clock time to resolve the git/non-git topology, in milliseconds. */
	readonly classificationDurationMs: number;
}

type AgentHostSessionMaterializedEvent = {
	provider: string;
	source: string;
	wasProvisional: boolean;
	folderCount: number;
	gitBackedFolderCount: number;
	uniqueGitRepoCount: number;
	nonGitFolderCount: number;
	isMultiRoot: boolean;
	classificationDurationMs: number;
};

type AgentHostSessionMaterializedClassification = {
	provider: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The agent provider handling the session.' };
	source: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'How the session was created (user, fork, import, or agentTool).' };
	wasProvisional: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Whether the session was created provisionally before it materialized.' };
	folderCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of effective working directories after materialization.' };
	gitBackedFolderCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of working directories backed by a git repository (pre-deduplication).' };
	uniqueGitRepoCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of unique git repositories the git-backed folders resolve to.' };
	nonGitFolderCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of working directories that are not git-backed.' };
	isMultiRoot: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Whether the materialized session spans more than one working directory.' };
	classificationDurationMs: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'Wall-clock time to resolve the git/non-git topology, in milliseconds.' };
	owner: 'DonJayamanne';
	comment: 'Tracks the resolved git/non-git topology of an agent host session once it materializes, to understand multi-root and multi-repository usage.';
};

export function reportAgentHostSessionMaterialized(telemetryService: ITelemetryService, data: IAgentHostSessionMaterializedData): void {
	telemetryService.publicLog2<AgentHostSessionMaterializedEvent, AgentHostSessionMaterializedClassification>('agentHost.sessionMaterialized', {
		provider: data.provider,
		source: data.source,
		wasProvisional: data.wasProvisional,
		folderCount: data.topology.folderCount,
		gitBackedFolderCount: data.topology.gitBackedFolderCount,
		uniqueGitRepoCount: data.topology.uniqueGitRepoCount,
		nonGitFolderCount: data.topology.nonGitFolderCount,
		isMultiRoot: data.topology.isMultiRoot,
		classificationDurationMs: data.classificationDurationMs,
	});
}
