// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { StyledSelect } from './StyledSelect';

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = () => {};
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
});
afterEach(cleanup);
function Example() {
  const [value, setValue] = useState('1');
  return <StyledSelect id="chapter" label="Chapter" value={value} onValueChange={setValue} options={['1','2','3'].map(value => ({value, label:value}))} />;
}
describe('styled select (component-only)', () => {
  it('opens a styled DOM listbox and supports keyboard selection and Escape', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole('combobox', { name:'Chapter' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toHaveClass('select-content');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(trigger).toHaveTextContent('2'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('2');
  });
});
