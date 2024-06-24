import React, { useState, useEffect } from 'react';

interface StatBarProps {
    label: string;
    initialValue: number;
}

const StatBar: React.FC<StatBarProps> = ({ label, initialValue }) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    return (
        <div className='flex gap-4 items-center'>
            <p className='text-gray-600'>{label}</p>
            <div
                style={{
                    width: `${2 * value}px`,
                    height: '5px',
                    backgroundColor: `hsl(${value}, 100%, 50%)`,
                    borderRadius: '15px',
                    overflow: 'hidden',
                    margin: '1rem 0'
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${value}%`,
                        transition: 'width 0.5s ease-out, background-color 0.5s ease-out',
                        backgroundSize: '300% 100%',
                        backgroundPosition: `${100 - value}% 0`,
                    }}
                />
            </div>
        </div>
    );
};

export default StatBar;