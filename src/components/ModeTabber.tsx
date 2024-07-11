import { useState } from 'react'
import { Button, ButtonGroup } from 'flowbite-react'
import PartyIcon from './PartyIcon'
import ClashIcon from './ClashIcon'

interface TabberProps {
  leftLabel: string
  rightLabel: string
}

export default function Component({ leftLabel, rightLabel }: TabberProps) {
  const [selectedTab, setSelectedTab] = useState('right')

  const handleTabClick = (tab: string) => {
    setSelectedTab(tab)
  }

  return (
    <div className="mx-4 max-lg:hidden">
      <ButtonGroup>
        <Button
          color={selectedTab === 'left' ? 'blue' : 'light'}
          title="Coming Soon!"
          disabled
          onClick={() => handleTabClick('left')}
        >
          <PartyIcon className="mr-3" selectedTab={selectedTab} />
          {leftLabel}
        </Button>
        <Button
          color={selectedTab === 'right' ? 'blue' : 'light'}
          onClick={() => handleTabClick('right')}
        >
          <ClashIcon className="mr-3" selectedTab={selectedTab} />
          {rightLabel}
        </Button>
      </ButtonGroup>
    </div>
  )
}
