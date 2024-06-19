import { Button, ButtonGroup } from "flowbite-react";
import PartyIcon from "./PartyIcon";
import ClashIcon from "./ClashIcon";

export default function Component() {
  return (
    <div className="mx-4">
      <ButtonGroup>
        <Button color="gray">
          <PartyIcon className="mr-3" />
          Casual
        </Button>
        <Button color="gray" disabled>
          <ClashIcon className="mr-3" />
          Competitive
        </Button>
      </ButtonGroup>
    </div>
  );
}