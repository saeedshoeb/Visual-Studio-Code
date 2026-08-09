/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ITelemetryService } from '../../telemetry/common/telemetry.js';

/** The static changeset slot a compute was for. */
export type StaticChangesetTelemetryKind = 'branch' | 'session' | 'uncommitted';

/**
 * The result of a static changeset compute.
 * - `computed`: diffs were published.
 * - `preserved`: git was unavailable and the cached branch changeset was kept.
 * - `gitUnavailable`: git produced no diff and there is no fallback (uncommitted).
 * - `dbOpenFailed`: the session database could not be opened.
 * - `error`: the compute threw.
 */
export type StaticChangesetOutcome = 'computed' | 'preserved' | 'gitUnavailable' | 'dbOpenFailed' | 'error';

export interface IStaticChangesetTelemetryData {
	readonly kind: StaticChangesetTelemetryKind;
	readonly outcome: StaticChangesetOutcome;
	readonly durationMs: number;
	readonly fileCount: number;
	readonly isMultiRoot: boolean;
	/** Whether the incremental session-diff path was taken (session kind only). */
	readonly incrementalUsed: boolean;
	/** Whether the SDK edit-tracker fallback produced the diffs (session kind only). */
	readonly usedEditTrackerFallback: boolean;
}

type StaticChangesetComputedEvent = {
	kind: string;
	outcome: string;
	durationMs: number;
	fileCount: number;
	isMultiRoot: boolean;
	incrementalUsed: boolean;
	usedEditTrackerFallback: boolean;
};

type StaticChangesetComputedClassification = {
	kind: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The static changeset slot computed (branch, session, or uncommitted).' };
	outcome: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The result of the compute (computed, preserved, gitUnavailable, dbOpenFailed, or error).' };
	durationMs: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'Wall-clock time to compute the static changeset, in milliseconds.' };
	fileCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of changed files in the computed changeset.' };
	isMultiRoot: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Whether the session spans more than one working directory.' };
	incrementalUsed: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'Whether the incremental session-diff path was taken.' };
	usedEditTrackerFallback: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'Whether the SDK edit-tracker fallback produced the diffs instead of git.' };
	owner: 'DonJayamanne';
	comment: 'Tracks how long the agent host takes to compute a static (branch/session/uncommitted) changeset and its outcome, to monitor multi-root changeset performance and health.';
};

export function reportAgentHostStaticChangesetComputed(telemetryService: ITelemetryService, data: IStaticChangesetTelemetryData): void {
	telemetryService.publicLog2<StaticChangesetComputedEvent, StaticChangesetComputedClassification>('agentHost.staticChangesetComputed', {
		kind: data.kind,
		outcome: data.outcome,
		durationMs: data.durationMs,
		fileCount: data.fileCount,
		isMultiRoot: data.isMultiRoot,
		incrementalUsed: data.incrementalUsed,
		usedEditTrackerFallback: data.usedEditTrackerFallback,
	});
}

/**
 * The result of a per-turn changeset compute.
 * - `computed`: diffs were published.
 * - `dbOpenFailed`: the session database could not be opened.
 * - `resolveFailed`: the multi-root repository split could not be resolved.
 * - `error`: the compute threw.
 */
export type TurnChangesetOutcome = 'computed' | 'dbOpenFailed' | 'resolveFailed' | 'error';

export interface ITurnChangesetTelemetryData {
	readonly outcome: TurnChangesetOutcome;
	readonly durationMs: number;
	readonly isMultiRoot: boolean;
	/** Unique git repositories the turn diff fanned out to (multi-root only). */
	readonly repoCount: number;
	/** Non-git folders whose diff came from tracked edits (multi-root only). */
	readonly nonGitFolderCount: number;
	readonly fileCount: number;
	/** Whether the per-repo fan-out was capped. */
	readonly capHit: boolean;
	/** Repositories whose git diff was unavailable and fell back to tracked edits. */
	readonly perRepoFallbackCount: number;
}

type TurnChangesetComputedEvent = {
	outcome: string;
	durationMs: number;
	isMultiRoot: boolean;
	repoCount: number;
	nonGitFolderCount: number;
	fileCount: number;
	capHit: boolean;
	perRepoFallbackCount: number;
};

type TurnChangesetComputedClassification = {
	outcome: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The result of the compute (computed, dbOpenFailed, resolveFailed, or error).' };
	durationMs: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'Wall-clock time to compute the per-turn changeset, in milliseconds.' };
	isMultiRoot: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Whether the session spans more than one working directory.' };
	repoCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of unique git repositories the turn diff fanned out to.' };
	nonGitFolderCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of non-git folders whose diff came from tracked edits.' };
	fileCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'The number of changed files in the computed turn changeset.' };
	capHit: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'Whether the per-repository fan-out was capped.' };
	perRepoFallbackCount: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'The number of repositories whose git diff was unavailable and fell back to tracked edits.' };
	owner: 'DonJayamanne';
	comment: 'Tracks how long the agent host takes to compute a per-turn changeset and its outcome, to monitor multi-root turn changeset performance and health.';
};

export function reportAgentHostTurnChangesetComputed(telemetryService: ITelemetryService, data: ITurnChangesetTelemetryData): void {
	telemetryService.publicLog2<TurnChangesetComputedEvent, TurnChangesetComputedClassification>('agentHost.turnChangesetComputed', {
		outcome: data.outcome,
		durationMs: data.durationMs,
		isMultiRoot: data.isMultiRoot,
		repoCount: data.repoCount,
		nonGitFolderCount: data.nonGitFolderCount,
		fileCount: data.fileCount,
		capHit: data.capHit,
		perRepoFallbackCount: data.perRepoFallbackCount,
	});
}
