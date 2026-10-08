import * as Select from '@radix-ui/react-select';

interface Props {
  id: string;
  label: string;
  value: string;
  options: { value:string; label:string }[];
  onValueChange: (value:string) => void;
}

/** Real DOM menu: keyboard, focus restoration, and dismissal belong to Radix. */
export function StyledSelect({ id, label, value, options, onValueChange }: Props) {
  return <>
    <label id={`${id}-label`} htmlFor={id}>{label}</label>
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger id={id} className="select-trigger" aria-labelledby={`${id}-label`}>
        <Select.Value /><Select.Icon aria-hidden="true" className="select-chevron">⌄</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-content" position="popper" sideOffset={5} collisionPadding={12}>
          <Select.ScrollUpButton className="select-scroll" aria-label="Scroll up">⌃</Select.ScrollUpButton>
          <Select.Viewport className="select-viewport">
            {options.map(option => <Select.Item className="select-item" key={option.value} value={option.value}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator className="select-indicator" aria-hidden="true">✓</Select.ItemIndicator>
            </Select.Item>)}
          </Select.Viewport>
          <Select.ScrollDownButton className="select-scroll" aria-label="Scroll down">⌄</Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </>;
}
