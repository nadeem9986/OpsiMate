import { Alert } from '@OpsiMate/shared';
import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useAlertSelection } from '@/components/Alerts/AlertsTable/hooks/useAlertSelection';

const alert = (id: string) => ({ id }) as Alert;
const ids = (alerts: Alert[]) => alerts.map((a) => a.id);

const setup = (sortedAlerts: Alert[], selectedAlerts: Alert[], withCallback = true) => {
	const onSelectAlerts = vi.fn();
	const { result } = renderHook(() =>
		useAlertSelection({
			sortedAlerts,
			selectedAlerts,
			onSelectAlerts: withCallback ? onSelectAlerts : undefined,
		})
	);
	return { result, onSelectAlerts };
};

describe('useAlertSelection', () => {
	test('allSelected is false for an empty table', () => {
		const { result } = setup([], []);
		expect(result.current.allSelected).toBe(false);
	});

	test('allSelected is true only when every row of this table is selected', () => {
		const table = [alert('a'), alert('b')];
		expect(setup(table, [alert('a')]).result.current.allSelected).toBe(false);
		expect(setup(table, [alert('a'), alert('b')]).result.current.allSelected).toBe(true);
	});

	test('allSelected ignores picks from the other table', () => {
		const table = [alert('a'), alert('b')];
		// Same count as the table, but none of the ids belong to it.
		expect(setup(table, [alert('x'), alert('y')]).result.current.allSelected).toBe(false);
		// Extra picks from the other table do not stop this table from being fully selected.
		expect(setup(table, [alert('a'), alert('b'), alert('x')]).result.current.allSelected).toBe(true);
	});

	test('select all unions with the existing selection and keeps the other table picks', () => {
		const { result, onSelectAlerts } = setup([alert('a'), alert('b')], [alert('a'), alert('x')]);
		result.current.handleSelectAll();
		expect(onSelectAlerts).toHaveBeenCalledTimes(1);
		expect(ids(onSelectAlerts.mock.calls[0][0])).toEqual(['a', 'x', 'b']);
	});

	test('un-select all removes only the rows of this table', () => {
		const { result, onSelectAlerts } = setup([alert('a'), alert('b')], [alert('a'), alert('b'), alert('x')]);
		result.current.handleSelectAll();
		expect(onSelectAlerts).toHaveBeenCalledTimes(1);
		expect(ids(onSelectAlerts.mock.calls[0][0])).toEqual(['x']);
	});

	test('handleSelectAlert adds an unselected alert and removes a selected one', () => {
		const table = [alert('a'), alert('b')];
		const add = setup(table, [alert('a')]);
		add.result.current.handleSelectAlert(alert('b'));
		expect(ids(add.onSelectAlerts.mock.calls[0][0])).toEqual(['a', 'b']);

		const remove = setup(table, [alert('a'), alert('b')]);
		remove.result.current.handleSelectAlert(alert('a'));
		expect(ids(remove.onSelectAlerts.mock.calls[0][0])).toEqual(['b']);
	});

	test('handlers are no-ops when onSelectAlerts is not provided', () => {
		const { result } = setup([alert('a')], [], false);
		expect(() => result.current.handleSelectAll()).not.toThrow();
		expect(() => result.current.handleSelectAlert(alert('a'))).not.toThrow();
	});
});
