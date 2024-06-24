import React, { useState, useEffect } from 'react';

interface StatBarProps {
    label: string;
    initialValue: number;
}

const StatBar: React.FC<StatBarProps> = ({ label, initialValue }) => {
    const [additionalValue, setAdditionalValue] = useState(0);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAdditionalValue(parseInt(event.target.value));
    };

    useEffect(() => {
        setAdditionalValue(0);
    }, [initialValue]);

    const totalValue = initialValue + additionalValue;

    return (
        <div className='flex gap-4 items-center'>
            <p className='text-gray-600 text-nowrap'>{label}</p>
            <div className='flex flex-col'>
                <div
                    style={{
                        width: `${1.25 * totalValue}px`,
                        height: '5px',
                        backgroundColor: `hsl(${totalValue / 1.25}, 100%, 50%)`,
                        borderRadius: '15px',
                        overflow: 'hidden',
                        margin: '1rem 0'
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${totalValue}%`,
                            transition: 'width 0.5s ease-out, background-color 0.5s ease-out',
                            backgroundSize: '300% 100%',
                            backgroundPosition: `${100 - totalValue}% 0`,
                        }}
                    />
                </div>
                <input
                    className='w-32'
                    type="range"
                    min="0"
                    max="100"
                    value={additionalValue}
                    onChange={handleChange}
                />
            </div>
            <p>Total: {totalValue}</p>
        </div>
    );
};

export default StatBar;