"use client"
import React, { useState, useRef } from 'react';

const DropdownMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const filterItems = (item: string) => {
    const text = item.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  };

  return (
    <div className="flex items-center justify-center">
      <div className="relative group" ref={dropdownRef}>
        <button
          id="dropdown-button"
          className="inline-flex justify-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500 transition-transform duration-200 hover:bg-gray-100"
          onClick={toggleDropdown}
        >
          <span className="mr-2">Teams</span>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <a
              href="#"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 active:bg-blue-100 cursor-pointer rounded-md"
              style={{ display: filterItems('uppercase') ? 'block' : 'none' }}
            >
              Team 1
            </a>
            <a
              href="#"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 active:bg-blue-100 cursor-pointer rounded-md"
              style={{ display: filterItems('lowercase') ? 'block' : 'none' }}
            >
              Team 2
            </a>
            <a
              href="#"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 active:bg-blue-100 cursor-pointer rounded-md"
              style={{ display: filterItems('camelcase') ? 'block' : 'none' }}
            >
              Team 3
            </a>
            <a
              href="#"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 active:bg-blue-100 cursor-pointer rounded-md"
              style={{ display: filterItems('kebabcase') ? 'block' : 'none' }}
            >
              Team 4
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropdownMenu;