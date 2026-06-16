import React, { useState, useEffect } from 'react';
import { Clock, Smile, Leaf, Coffee, Activity, Compass, Lightbulb, Flag, Search, Plus } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  startFull?: boolean;
}

const CATEGORIES = [
  { id: 'smileys', label: 'Smileys', icon: Smile },
  { id: 'nature', label: 'Nature', icon: Leaf },
  { id: 'food', label: 'Food', icon: Coffee },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'travel', label: 'Travel', icon: Compass },
  { id: 'objects', label: 'Objects', icon: Lightbulb },
  { id: 'flags', label: 'Flags', icon: Flag },
  { id: 'recent', label: 'Recent', icon: Clock },
];

const EMOJI_DATA: Record<string, string[]> = {
  smileys: [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃'
  ],
  nature: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🕷️', 'Scorpion', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐕', '🐈', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🕊️', '🦢', '🦩', '🦜', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '🍀', '🍁', '🍂', '🍃'
  ],
  food: [
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', ' Broccoli', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🥙', '🥘', '🍲', '🥣', '🥗', '🍿', ' butter', '🧈', '🧂', '🍣', '🍤', '🍜', '🍝', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋', '🧃', '🧉', '🧊'
  ],
  activity: [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', ' volleyball', ' volleyball', '🏐', '🏉', '🎱', '🪀', '🏓', ' badminton', '🏸', ' hockey', '🏒', '🏑', ' Cricket', '🏏', '🎯', ' Kite', '🪁', '🏹', ' fishing', '🎣', '🤿', ' boxing', '🥊', '🥋', ' skateboarding', '🛹', '🛼', ' sledding', '🛷', '⛸️', ' curling', '🥌', ' skiing', '🎿', '🏂', '🪂', '🏋️', '🤼', ' gymnastics', '🤸', '⛹️', ' fencing', '🤺', '🤾', ' golfing', '🏌️', ' surfing', '🏄', ' swimming', '🏊', ' waterpolo', '🤽', ' rowing', '🚣', ' climbing', '🧗', ' cycling', '🚴', '🚵'
  ],
  travel: [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚏', '🛣️', '🚂', '🚆', '🚀', '🛸', '🚁', '✈️', '⛵', '🛳️', '🚢', '⚓', '⛽', '🚧', '🗺️', '🧭', '🏔️', '🌋', '⛺', '🏕️', '🏖️', '🏜️', '🏝️', '🏙️', '🏡', '🏢', '🏰', '🎡', '🎢', ' fountain', '⛲', '🎑'
  ],
  objects: [
    '⌚', '📱', '📲', '💻', '⌨️', '🖱️', '🖥️', '🖨️', '🔮', '📿', '💄', '💍', '💼', '👜', '🎒', '🧳', '👓', '🕶️', '🥽', '🥼', '🪖', '🌂', '☔', '🧵', '🪡', '🧶', '🧷', '🧦', '🧤', '🧣', '🎩', '🧢', '👑', '🎓', '🥾', '👟', '👠', '👡', '👢', '𩵳', '𩵵', '𩵶', '𩵷', '𩵸', '𩵹', '𩵺', '𩵻', '𩵼', '𩵽', '𩵾', '𩵿', '𩶀', '𩶁', '𩶂', '𩶃', '𩶄', '𩶅', '𩶆', '𩶇', '𩶈', '𩶉', '𩶊', '𩶋', '𩶌', '𩶍', '𩶎', '𩶏', '𩶐', '𩶑', '𩶒', '𩶓', '𩶔', '𩶕', '𩶖', '𩶗', '𩶘', '𩶙', '𩶚', '𩶛', '𩶜', '𩶝', '𩶞', '𩶟', '𩶠', '𩶡', '𩶢', '𩶣', '𩶤', '𩶥', '𩶦', '𩶧', '𩶨', '𩶩', '𩶪', '𩶫', '𩶬', '𩶭', '𩶮', '𩶯', '𩶰', '𩶱', '𩶲', '𩶳', '𩶴', '𩶵', '𩶶', '𩶷', '𩶸', '𩶹', '𩶺', '𩶻', '𩶼', '𩶽', '𩶾', '𩶿', '𩷀', '𩷁', '𩷂', '𩷃', '𩷄', '𩷅', '𩷆', '𩷇', '𩷈', '𩷉', '𩷊', '𩷋', '𩷌', '𩷍', '𩷎', '𩷏', '𩷐', '𩷑', '𩷒', '𩷓', '𩷔', '𩷕', '𩷖', '𩷗', '𩷘', '𩷙', '𩷚', '𩷛', '𩷜', '𩷝', '𩷞', '𩷟', '𩷠', '𩷡', '𩷢', '𩷣', '𩷤', '𩷥', '𩷦', '𩷧', '𩷨', '𩷩', '𩷪', '𩷫', '𩷬', '𩷭', '𩷮', '𩷯', '𩷰', '𩷱', '𩷲', '𩷳', '𩷴', '𩷵', '𩷶', '𩷷', '𩷸', '𩷹', '𩷺', '𩷻', '𩷼', '𩷽', '𩷾', '𩷿', '𩸀', '𩸁', '𩸂', '𩸃', '𩸄', '𩸅', '𩸆', '𩸇', '𩸈', '𩸉', '𩸊', '𩸋', '𩸌', '𩸍', '𩸎', '𩸏', '𩸐', '𩸑', '𩸒', '𩸓', '𩸔', '𩸕', '𩸖', '𩸗', '𩸘', '𩸙', '𩸚', '𩸛', '𩸜', '𩸝', '𩸞', '𩸟', '𩸠', '𩸡', '𩸢', '𩸣', '𩸤', '𩸥', '𩸦', '𩸧', '𩸨', '𩸩', '𩸪', '𩸫', '𩸬', '𩸭', '𩸮', '𩸯', '𩸰', '𩸱', '𩸲', '𩸳', '𩸴', '𩸵', '𩸶', '𩸷', '𩸸', '𩸹', '𩸺', '𩸻', '𩸼', '𩸽', '𩸾', '𩸿', '𩹀', '𩹁', '𩹂', '𩹃', '𩹄', '𩹅', '𩹂', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '☯️', '🛐', '⚠️', '🚨', '🚩', '🏁', '🏳️', '🏴', '🏴‍☠️'
  ],
  flags: [
    '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇬🇧', '🇨🇦', '🇮🇳', '🇯🇵', '🇩🇪', '🇫🇷', '🇮🇹', '🇪🇸', '🇷🇺', '🇨🇳', '🇧🇷', '🇦🇺', '🇿🇦', '🇰🇷', '🇲🇽', '🇸🇬', '🇮🇩', '🇲🇾', '🇳🇿', '🇵🇭', '🇻🇳', '🇹🇭', '🇮🇪', '🇨🇭', '🇸🇪', '🇳🇱', '🇧🇪', '🇦🇹', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇺🇦', '🇹🇷', '🇸🇦', '🇦🇪', '🇶🇦', '🇮🇱', '🇪🇬', '🇳🇬', '🇰🇪'
  ]
};

const EMOJI_KEYWORDS: Record<string, string> = {
  '😀': 'smile face grin happy joy',
  '😃': 'smile face grin happy joy',
  '😄': 'smile face grin happy joy',
  '😁': 'smile face grin happy joy beam',
  '😆': 'smile face grin happy joy laugh',
  '😅': 'smile face grin happy joy sweat',
  '😂': 'laugh cry tear joy lol haha',
  '🤣': 'laugh roll floor lol haha',
  '😊': 'smile face happy blush',
  '😇': 'smile face angel halo holy',
  '🙂': 'smile face slight',
  '🙃': 'smile face upside down',
  '😉': 'wink smile face blink',
  '😌': 'smile face relieved calm content',
  '😍': 'love heart eyes smile face adore',
  '🥰': 'love heart cheeks smile face adore',
  '😘': 'love kiss heart blow face',
  '😋': 'food delicious yum face tongue',
  '😛': 'face tongue poke',
  '😜': 'wink face tongue poke blink',
  '🤪': 'crazy goofy face tongue eye',
  '🤨': 'raise eyebrow face suspicious',
  '🧐': 'monocle face spy search',
  '🤓': 'nerd glasses smart book',
  '😎': 'cool sunglasses shade face style',
  '🥸': 'disguise mask mustache face glasses',
  '🤩': 'star eyes amazed face wow',
  '🥳': 'party celebrate hat horn blow',
  '😏': 'smirk face sly half smile',
  '😒': 'unamused face meh unimpressed',
  '😞': 'sad disappointed face regret',
  '😔': 'sad pensive face depressed',
  '😟': 'sad worried face anxious',
  '🥺': 'sad plead beg eyes puppy cry',
  '😢': 'sad cry tear face weep',
  '😭': 'sad cry tear face weep sob lol',
  '😤': 'angry triumph steam face snort',
  '😠': 'angry mad face annoyed',
  '😡': 'angry mad red pout face fury',
  '🤬': 'angry swear curse face mouth',
  '🤯': 'mind blown explode head amaze',
  '😳': 'blush flushed wide eyes face shock',
  '🥵': 'hot red sweat tongue face heat',
  '🥶': 'cold blue teeth ice freeze face',
  '😱': 'scared scream fear face gasp ooh',
  '😨': 'scared fear face anxious',
  '😰': 'scared fear sweat blue face',
  '🤫': 'shh quiet silence whisper mouth finger',
  '🤥': 'lie nose long pinocchio face',
  '😶': 'blank mouth silent face empty',
  '😐': 'meh neutral face straight blank',
  '😑': 'meh expressionless face straight blank',
  '😬': 'grimace teeth face awkward oops',
  '🫨': 'shake face vibrate blur shock',
  '🫠': 'melt hot face liquid disappear',
  '🙄': 'roll eyes face bored meh',
  '😯': 'surprise gasp face open mouth',
  '😦': 'surprise frown face open mouth',
  '😧': 'surprise worry face open mouth',
  '😮': 'surprise gasp face open mouth ooh',
  '😲': 'surprise amaze face open mouth wow',
  '🥱': 'yawn sleep tired face mouth',
  '😴': 'sleep tired zzz face snore',
  '🤤': 'drool sleep delicious face mouth',
  '😪': 'sleep tired snot tear face',
  '😵': 'dizzy dead cross eyes face shock',
  '🤐': 'zip mouth shut silent secret face',
  '🥴': 'drunk woozy face uneven eyes',
  '🤢': 'sick green throw up vomit face disgust',
  '🤮': 'sick throw up vomit face disgust open',
  '🤧': 'sick sneeze tissue blow nose face',
  '😷': 'sick mask doctor medical face health',
  '🤒': 'sick thermometer fever hot face health',
  '🤕': 'sick bandage head hurt face health',
  '😈': 'devil horn purple smile evil',
  '👿': 'devil horn purple angry evil',
  '👹': 'ogre monster mask red teeth',
  '👺': 'goblin mask red long nose nose',
  '🤡': 'clown circus makeup hair face',
  '💩': 'poop turd brown smile emoji',
  '👻': 'ghost spooky halloween white',
  '💀': 'skull bone dead skeleton halloween',
  '☠️': 'skull bone dead skeleton pirate danger',
  '👽': 'alien space ufo martian green',
  '👾': 'alien monster game retro purple space',
  '🤖': 'robot toy metal gear face',
  '🎃': 'pumpkin jack lantern halloween orange',
  '👍': 'like thumbs up agree good yes ok',
  '👎': 'dislike thumbs down disagree bad no',
  '❤️': 'love heart red relation',
  '🔥': 'fire hot burn flame lit warm',
  '🎉': 'party celebrate horn confetti popper',
  '🚀': 'rocket space ship fly speed launch',
  '🙏': 'please pray thank hands greeting namaste',
  '🤔': 'think ponder question bubble hand chin',
  '👀': 'eyes look watch see spy double',
  '💯': 'hundred score absolute perfect grade',
  '✅': 'check mark tick green agree ok yes',
  '❌': 'cross mark x red disagree error no',
  '✨': 'sparkle shine star glitter magical gold',
  '🎈': 'balloon celebrate party red float',
  '🌟': 'star shine gold yellow bright space',
  '👏': 'clap hands praise approval bravo',
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose, startFull = false }) => {
  const [showFullPicker, setShowFullPicker] = useState<boolean>(startFull);
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recents, setRecents] = useState<string[]>([]);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('emoji-picker-recent');
      if (stored) {
        setRecents(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSelectEmoji = (emoji: string) => {
    onSelectEmoji(emoji);
    
    // Add to recents
    const updated = [emoji, ...recents.filter(r => r !== emoji)].slice(0, 24);
    setRecents(updated);
    try {
      localStorage.setItem('emoji-picker-recent', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const getFilteredEmojis = () => {
    if (!searchQuery) {
      if (activeCategory === 'recent') {
        return recents;
      }
      return EMOJI_DATA[activeCategory] || [];
    }
    
    const query = searchQuery.toLowerCase().trim();
    const matches: string[] = [];
    
    // Scan all categories
    Object.entries(EMOJI_DATA).forEach(([cat, list]) => {
      list.forEach(emoji => {
        const keywords = EMOJI_KEYWORDS[emoji] || '';
        const categoryName = cat.toLowerCase();
        if (
          keywords.includes(query) || 
          emoji.includes(query) || 
          categoryName.includes(query)
        ) {
          if (!matches.includes(emoji)) {
            matches.push(emoji);
          }
        }
      });
    });
    
    return matches;
  };

  const visibleEmojis = getFilteredEmojis();

  // Helper to get name of hovered emoji
  const getHoveredEmojiName = () => {
    if (!hoveredEmoji) return '';
    const keywords = EMOJI_KEYWORDS[hoveredEmoji];
    if (!keywords) return 'Emoji';
    const firstKeyword = keywords.split(' ')[0];
    return firstKeyword.charAt(0).toUpperCase() + firstKeyword.slice(1);
  };

  if (!showFullPicker) {
    return (
      <div 
        className="emoji-picker-compact flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-full shadow-lg overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {['👍', '❤️', '😂', '🎉', '🔥'].map(emoji => (
          <button
            type="button"
            key={emoji}
            onClick={() => handleSelectEmoji(emoji)}
            className="w-8 h-8 text-lg flex items-center justify-center hover:bg-slate-100 rounded-full transition-all cursor-pointer active:scale-90"
          >
            {emoji}
          </button>
        ))}
        <div className="w-[1px] h-4 bg-slate-200 mx-0.5 shrink-0" />
        <button
          type="button"
          onClick={() => setShowFullPicker(true)}
          className="w-8 h-8 text-slate-500 hover:text-slate-800 text-base flex items-center justify-center hover:bg-slate-100 rounded-full transition-all cursor-pointer active:scale-90"
          title="More Emojis"
        >
          <Plus size={15} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="emoji-picker-container flex flex-col w-[320px] h-[360px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Header */}
      <div className="p-3 border-b border-slate-100 flex flex-col gap-2">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex items-center justify-between border-t border-slate-50 pt-2 px-0.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              // Skip recent if empty
              if (cat.id === 'recent' && recents.length === 0) return null;
              const isActive = activeCategory === cat.id;
              
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  title={cat.label}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-650' 
                      : 'text-slate-400 hover:text-slate-655 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin bg-slate-50/20">
        {visibleEmojis.length > 0 ? (
          <div className="grid grid-cols-7 gap-1">
            {visibleEmojis.map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => handleSelectEmoji(emoji)}
                onMouseEnter={() => setHoveredEmoji(emoji)}
                onMouseLeave={() => setHoveredEmoji(null)}
                className="w-9 h-9 text-xl flex items-center justify-center hover:bg-slate-100 rounded-xl transition-all cursor-pointer select-none active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-10">
            <span>No emojis found</span>
          </div>
        )}
      </div>

      {/* Footer / Preview Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between h-[42px] select-none">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2">
            <span className="text-xl">{hoveredEmoji}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getHoveredEmojiName()}</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">Select an emoji...</span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
