import { RetentionSettings } from '@/components/Settings/RetentionSettings';
import {
	useRetentionSettings,
	useRunRetention,
	useUpdateRetentionConfig,
	useUpdateRetentionPolicy,
} from '@/hooks/queries/retention/useRetention';
import {
	RetentionConfig,
	RetentionPolicy,
	RetentionResource,
	RetentionSettings as RetentionSettingsData,
} from '@OpsiMate/shared';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from './test-utils';

vi.mock('@/hooks/queries/retention/useRetention');

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: toastMock }),
	toast: toastMock,
}));

interface MutateCallbacks {
	onSuccess?: () => void;
	onError?: (error: unknown) => void;
}

interface PolicyUpdates {
	enabled?: boolean;
	retentionDays?: number;
}

interface PolicyMutationVariables {
	resourceType: RetentionResource;
	updates: PolicyUpdates;
}

interface ToastArgs {
	title?: string;
	description?: string;
	variant?: string;
}

const config: RetentionConfig = {
	cleanupIntervalHours: 24,
	vacuumAfterCleanup: false,
	lastRunAt: null,
};

const auditPolicy: RetentionPolicy = {
	resourceType: RetentionResource.AuditLogs,
	enabled: true,
	retentionDays: 90,
	updatedAt: '2026-10-01T00:00:00.000Z',
};

const settings: RetentionSettingsData = { config, policies: [auditPolicy] };

const policyMutate = vi.fn<(variables: PolicyMutationVariables, callbacks?: MutateCallbacks) => void>();
const configMutate = vi.fn<(variables: Partial<RetentionConfig>, callbacks?: MutateCallbacks) => void>();

const destructiveToasts = (): ToastArgs[] =>
	toastMock.mock.calls.map(([args]) => args as ToastArgs).filter((args) => args.variant === 'destructive');

beforeEach(() => {
	vi.mocked(useRetentionSettings).mockReturnValue({
		data: settings,
		isLoading: false,
		error: null,
	} as unknown as ReturnType<typeof useRetentionSettings>);
	vi.mocked(useUpdateRetentionPolicy).mockReturnValue({
		mutate: policyMutate,
		isPending: false,
	} as unknown as ReturnType<typeof useUpdateRetentionPolicy>);
	vi.mocked(useUpdateRetentionConfig).mockReturnValue({
		mutate: configMutate,
		isPending: false,
	} as unknown as ReturnType<typeof useUpdateRetentionConfig>);
	vi.mocked(useRunRetention).mockReturnValue({
		mutate: vi.fn(),
		isPending: false,
	} as unknown as ReturnType<typeof useRunRetention>);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('RetentionSettings toggles', () => {
	test('flipping a policy switch saves the flipped value', () => {
		render(<RetentionSettings />);
		fireEvent.click(screen.getByRole('switch', { name: 'Enable retention for Audit logs' }));

		expect(policyMutate).toHaveBeenCalledWith(
			{ resourceType: 'audit_logs', updates: { enabled: false } },
			expect.objectContaining({ onError: expect.any(Function) })
		);
	});

	test('a failed policy save raises a destructive toast with the server message', () => {
		render(<RetentionSettings />);
		fireEvent.click(screen.getByRole('switch', { name: 'Enable retention for Audit logs' }));

		policyMutate.mock.calls[0][1]?.onError?.(new Error('boom'));

		expect(destructiveToasts()).toEqual([
			expect.objectContaining({ title: 'Failed to save', description: expect.stringContaining('boom') }),
		]);
	});

	test('flipping the reclaim switch saves the flipped value', () => {
		render(<RetentionSettings />);
		fireEvent.click(screen.getByRole('switch', { name: 'Reclaim disk space after cleanup' }));

		expect(configMutate).toHaveBeenCalledWith(
			{ vacuumAfterCleanup: true },
			expect.objectContaining({ onError: expect.any(Function) })
		);
	});

	test('a failed reclaim save raises a destructive toast with the server message', () => {
		render(<RetentionSettings />);
		fireEvent.click(screen.getByRole('switch', { name: 'Reclaim disk space after cleanup' }));

		configMutate.mock.calls[0][1]?.onError?.(new Error('boom'));

		expect(destructiveToasts()).toEqual([
			expect.objectContaining({ title: 'Failed to save', description: expect.stringContaining('boom') }),
		]);
	});

	test('successful toggles raise no destructive toast', () => {
		render(<RetentionSettings />);
		fireEvent.click(screen.getByRole('switch', { name: 'Enable retention for Audit logs' }));
		fireEvent.click(screen.getByRole('switch', { name: 'Reclaim disk space after cleanup' }));

		policyMutate.mock.calls[0][1]?.onSuccess?.();
		configMutate.mock.calls[0][1]?.onSuccess?.();

		expect(destructiveToasts()).toEqual([]);
	});
});

interface PolicyFixture {
	resourceType: RetentionResource;
	title: string;
	retentionDays: number;
}

// One policy per resource, each with a distinct retentionDays so the values can be told apart.
const POLICY_FIXTURES: PolicyFixture[] = [
	{ resourceType: RetentionResource.ActiveAlerts, title: 'Active alerts', retentionDays: 11 },
	{ resourceType: RetentionResource.ResolvedAlerts, title: 'Resolved alerts', retentionDays: 12 },
	{ resourceType: RetentionResource.AlertStatusHistory, title: 'Alert status history', retentionDays: 13 },
	{ resourceType: RetentionResource.AlertHistoryEvents, title: 'Alert history events', retentionDays: 14 },
	{ resourceType: RetentionResource.AlertComments, title: 'Alert comments', retentionDays: 15 },
	{ resourceType: RetentionResource.RootCauses, title: 'Root cause analyses', retentionDays: 16 },
	{ resourceType: RetentionResource.EnrichmentVersions, title: 'Enrichment versions', retentionDays: 17 },
	{ resourceType: RetentionResource.AuditLogs, title: 'Audit logs', retentionDays: 18 },
];

describe('RetentionSettings number inputs', () => {
	beforeEach(() => {
		const allPolicies: RetentionSettingsData = {
			config,
			policies: POLICY_FIXTURES.map(({ resourceType, retentionDays }) => ({
				resourceType,
				enabled: true,
				retentionDays,
				updatedAt: '2026-10-01T00:00:00.000Z',
			})),
		};
		vi.mocked(useRetentionSettings).mockReturnValue({
			data: allPolicies,
			isLoading: false,
			error: null,
		} as unknown as ReturnType<typeof useRetentionSettings>);
	});

	test('each policy input is found by its category name and shows that retentionDays', () => {
		render(<RetentionSettings />);
		for (const { title, retentionDays } of POLICY_FIXTURES) {
			const input = screen.getByRole('spinbutton', { name: `Retention days for ${title}` });
			expect((input as HTMLInputElement).value).toBe(String(retentionDays));
		}
	});

	test('the audit logs input is matched exactly once', () => {
		render(<RetentionSettings />);
		expect(screen.getAllByRole('spinbutton', { name: /audit logs/i })).toHaveLength(1);
	});

	test('the cleanup interval input is found by name and shows cleanupIntervalHours', () => {
		render(<RetentionSettings />);
		const input = screen.getByRole('spinbutton', { name: 'Cleanup interval in hours' });
		expect((input as HTMLInputElement).value).toBe(String(config.cleanupIntervalHours));
	});

	test('there are 9 number inputs and none has an empty accessible name', () => {
		render(<RetentionSettings />);
		const inputs = screen.getAllByRole('spinbutton');
		expect(inputs).toHaveLength(9);
		for (const input of inputs) {
			expect(input.getAttribute('aria-label')?.trim()).toBeTruthy();
		}
	});
});
