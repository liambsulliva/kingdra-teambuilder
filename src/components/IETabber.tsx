import { Button, ButtonGroup } from "flowbite-react";
import DownloadIcon from "./DownloadIcon";
import UploadIcon from "./UploadIcon";

interface TabberProps {
  leftLabel: string;
  rightLabel: string;
}

export default function Component({leftLabel, rightLabel}: TabberProps) {
  return (
    <div className="mx-4">
      <ButtonGroup>
        <Button color="gray" disabled>
          <DownloadIcon className="mr-3" />
          {leftLabel}
        </Button>
        <Button color="gray" disabled>
          <UploadIcon className="mr-3" />
          {rightLabel}
        </Button>
      </ButtonGroup>
    </div>
  );
}