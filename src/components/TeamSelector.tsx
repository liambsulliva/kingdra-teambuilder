"use client";
import React, { useEffect, useState, useRef } from "react";

interface TeamSelectorProps {
  numTeams: number;
  setSelectedTeam: (team: number) => void;
  onDeleteTeam: (index: number) => void;
}

const DropdownMenu = ({ numTeams, setSelectedTeam, onDeleteTeam }: TeamSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("Teams");
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleSelection = (index: number) => {
    setIsOpen(false);
    setTitle(`Team ${index + 1}`);
    setSelectedTeam(index);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const filterItems = (item: string) => {
    const text = item.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }

  const handleDeleteTeam = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    onDeleteTeam(index);
    if (index === numTeams - 1) {
      handleSelection(Math.max(0, index - 1));
    }
  };

  useEffect(() => {
    if (numTeams > 0) {
      handleSelection(numTeams - 1);
    }
  }, [numTeams]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <div className="relative group" ref={dropdownRef}>
        <button
          id="dropdown-button"
          className="inline-flex justify-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-800 transition-transform duration-200 hover:bg-gray-100"
          onClick={toggleDropdown}
        >
          <span className="mr-2">{title}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 ml-2 -mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M6.293 9.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 p-1 space-y-1">
            <input
              id="search-input"
              className="block w-full px-4 py-2 text-gray-800 border rounded-md border-gray-300 focus:outline-none"
              type="text"
              placeholder="Search"
              autoComplete="off"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {Array.from({ length: numTeams }, (_, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-100 active:bg-blue-100 cursor-pointer rounded-md gap-2"
                style={{
                  display: filterItems(`Team ${index + 1}`) ? "flex" : "none",
                }}
              >
                <span className="text-nowrap" onClick={() => handleSelection(index)}>Team {index + 1}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-500 hover:text-red-700"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  onClick={(e) => handleDeleteTeam(e, index)}
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropdownMenu;