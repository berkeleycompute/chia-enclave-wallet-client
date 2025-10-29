import React from 'react';
import { PiCaretDown, PiMagnifyingGlass } from 'react-icons/pi';

export type SelectorItem = {
  id: string;
  label: string;
};

interface SelectorProps {
  items: SelectorItem[];
  selectedId: string | null | undefined;
  onSelect: (itemId: string, item: SelectorItem) => void;
  placeholder?: string;
  className?: string;
}

export const Selector: React.FC<SelectorProps> = ({
  items,
  selectedId,
  onSelect,
  placeholder = 'Select an item',
  className = '',
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = items.find((i) => i.id === (selectedId || ''));
  const filtered = items.filter((i) => i.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`flex items-center justify-between w-full cursor-pointer p-2 rounded transition-colors border`}
        style={{borderColor: '#272830', backgroundColor: '#1B1C22'}}
      >
        <span className="text-sm font-medium truncate select-none" style={{color: '#EEEEF0'}}>
          {selected?.label || placeholder}
        </span>
        <PiCaretDown
          className={`ml-2 transition-transform ${
            dropdownOpen ? 'rotate-180' : ''
          }`}
          size={16}
          style={{color: '#EEEEF0'}}
        />
      </div>

      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-full rounded-lg rounded-t shadow-lg border z-50 max-h-80 overflow-hidden select-none"
        style={{backgroundColor: '#1B1C22', borderColor: '#272830'}}>
          <div className="relative">
            <PiMagnifyingGlass className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-silicongray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`text-sm pr-4 py-3 w-full border-t-0 border-l-0 border-r-0 border-b-1 !focus:border-none 
                    focus:ring-transparent !focus:border-b-0 
                    bg-transparent placeholder:text-silicongray-400`}
              style={{borderColor: '#272830', backgroundColor: '#1B1C22', paddingLeft: '40px'}}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id, item);
                    setDropdownOpen(false);
                    setSearchTerm('');
                  }}
                  className={`flex items-center w-full px-4 py-3 text-sm font-normal select-none`}
                  style={{backgroundColor: 'transparent', color: 'gray-400'}}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1B1C22';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    if (selectedId === item.id) { e.currentTarget.style.color = '#EEEEF0';
                    e.currentTarget.style.backgroundColor = '#1B1C22'; }
                    else { e.currentTarget.style.color = 'gray-400';
                    e.currentTarget.style.backgroundColor = 'transparent'; }
                  }}
                >
                  <span className="truncate">{item.label}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 select-none">
                No items found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Selector;
