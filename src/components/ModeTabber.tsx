import { Button, ButtonGroup } from "flowbite-react";
import PartyIcon from "./PartyIcon";
import ClashIcon from "./ClashIcon";

interface TabberProps {
  leftLabel: string;
  rightLabel: string;
}

export default function Component({leftLabel, rightLabel}: TabberProps) {
  return (
    <div className="mx-4">
      <ButtonGroup>
        <Button color="gray" disabled>
          <PartyIcon className="mr-3" />
          {leftLabel}
        </Button>
        <Button color="gray">
          <ClashIcon className="mr-3" />
          {rightLabel}
        </Button>
      </ButtonGroup>
    </div>
  );
}