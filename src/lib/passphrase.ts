/**
 * Offers a password instead of only refusing one.
 *
 * Telling somebody their password has been breached and leaving it there is
 * a dead end: the people most likely to hit it are the people who use one
 * password for everything, and "choose a different one" asks them to invent
 * and memorise a new secret while standing in a break room. Plenty just stop,
 * which is the worst outcome available — the account does not get made and
 * the bad password stays in use everywhere else.
 *
 * Four common words beat a mangled "P@ssw0rd1" on both counts that matter:
 * far more entropy, and you can actually remember it. The words are short,
 * concrete and unambiguous to type on a phone keyboard — no homophones, no
 * words that invite a spelling argument.
 */

/** Deliberately plain, concrete, and hard to misspell. */
const WORDS = [
  'amber', 'anchor', 'apple', 'arrow', 'autumn', 'bacon', 'badge', 'bakery',
  'balcony', 'bamboo', 'banjo', 'barley', 'basket', 'beacon', 'beetle', 'bishop',
  'biscuit', 'blanket', 'bonfire', 'boulder', 'bracket', 'brandy', 'brick', 'bridge',
  'bronze', 'bucket', 'buffalo', 'bundle', 'burrow', 'cabin', 'cactus', 'camel',
  'candle', 'canvas', 'canyon', 'cargo', 'carpet', 'cashew', 'castle', 'cedar',
  'cellar', 'cement', 'chapel', 'cheese', 'cherry', 'chimney', 'cinema', 'circus',
  'clover', 'cobalt', 'cockpit', 'collar', 'comet', 'compass', 'copper', 'coral',
  'cotton', 'cradle', 'crane', 'crater', 'cricket', 'crimson', 'crystal', 'cupboard',
  'curtain', 'cushion', 'dagger', 'dahlia', 'daisy', 'dentist', 'diamond', 'diesel',
  'dolphin', 'domino', 'donkey', 'dragon', 'drawer', 'drizzle', 'duvet', 'eagle',
  'easel', 'echo', 'ember', 'engine', 'envelope', 'falcon', 'fabric', 'ferry',
  'fiddle', 'flamingo', 'flannel', 'flask', 'flint', 'forest', 'fossil', 'fountain',
  'foxglove', 'freckle', 'funnel', 'gadget', 'gallon', 'garage', 'garden', 'gasket',
  'gazebo', 'ginger', 'glacier', 'glove', 'granite', 'gravel', 'grotto', 'guitar',
  'gutter', 'hammer', 'hamster', 'harbour', 'harvest', 'hazel', 'heather', 'hedgehog',
  'helmet', 'hermit', 'hickory', 'hollow', 'honey', 'hornet', 'hostel', 'iceberg',
  'igloo', 'indigo', 'ingot', 'island', 'ivory', 'jacket', 'jaguar', 'jasmine',
  'jersey', 'jigsaw', 'jockey', 'juniper', 'kayak', 'kennel', 'kettle', 'keyhole',
  'kingfisher', 'kitten', 'ladder', 'lagoon', 'lantern', 'lattice', 'lavender', 'ledger',
  'lemon', 'leopard', 'lettuce', 'lighthouse', 'lilac', 'linen', 'lizard', 'lobster',
  'locker', 'lollipop', 'lupin', 'magnet', 'magpie', 'mallet', 'mango', 'maple',
  'marble', 'marigold', 'market', 'marrow', 'meadow', 'medal', 'melon', 'mercury',
  'mermaid', 'metro', 'mitten', 'monsoon', 'moorland', 'mosaic', 'moth', 'muffin',
  'mulberry', 'mushroom', 'mustard', 'nectar', 'needle', 'nettle', 'nickel', 'nutmeg',
  'oatcake', 'ocean', 'octopus', 'olive', 'onion', 'opal', 'orbit', 'orchard',
  'organ', 'otter', 'oyster', 'paddle', 'pancake', 'panda', 'pantry', 'papaya',
  'parcel', 'parsnip', 'pasture', 'peacock', 'pebble', 'pelican', 'pencil', 'penguin',
  'pepper', 'petal', 'pewter', 'pheasant', 'piano', 'pickle', 'pigeon', 'pillow',
  'pilot', 'pine', 'pirate', 'pistachio', 'pixel', 'planet', 'plaster', 'platinum',
  'plum', 'pocket', 'pollen', 'pond', 'poppy', 'porch', 'postbox', 'pottery',
  'prawn', 'pretzel', 'pudding', 'puffin', 'pumpkin', 'puzzle', 'quarry', 'quartz',
  'quilt', 'rabbit', 'radish', 'rafter', 'ragdoll', 'rainbow', 'rattle', 'raven',
  'razor', 'reindeer', 'rhubarb', 'ribbon', 'rocket', 'rosemary', 'rowan', 'rudder',
  'ruler', 'rummage', 'rusty', 'saddle', 'saffron', 'salmon', 'sandal', 'sapphire',
  'sardine', 'satchel', 'sausage', 'scarf', 'scooter', 'seagull', 'seashell', 'seaweed',
  'sequin', 'shamrock', 'shelter', 'sherbet', 'shovel', 'shutter', 'silver', 'siren',
  'skillet', 'skylark', 'slate', 'sleigh', 'slipper', 'smoke', 'snorkel', 'snowdrop',
  'socket', 'sofa', 'sparrow', 'spinach', 'spire', 'sponge', 'spruce', 'squirrel',
  'stable', 'stadium', 'starling', 'stencil', 'stirrup', 'stork', 'stove', 'sugar',
  'sunbeam', 'sunset', 'swallow', 'sycamore', 'syrup', 'tadpole', 'tangerine', 'tankard',
  'tapestry', 'teapot', 'tempo', 'tennis', 'thimble', 'thistle', 'thunder', 'ticket',
  'tiger', 'timber', 'toaster', 'toffee', 'tomato', 'topaz', 'torch', 'tortoise',
  'toucan', 'towel', 'tractor', 'trapeze', 'treacle', 'trellis', 'trolley', 'trumpet',
  'tulip', 'tundra', 'tunnel', 'turnip', 'turtle', 'tweed', 'umbrella', 'unicorn',
  'vanilla', 'velvet', 'vinegar', 'violet', 'volcano', 'waffle', 'wagon', 'walnut',
  'walrus', 'wardrobe', 'warren', 'wasp', 'waterfall', 'weasel', 'whale', 'wheat',
  'whisker', 'whistle', 'willow', 'window', 'winter', 'wombat', 'woodland', 'yarrow',
  'yoghurt', 'zebra', 'zinnia', 'zipper',
] as const

/** How many words a suggestion uses. */
export const WORD_COUNT = 4

/**
 * Bits of entropy in a suggestion, from the list length rather than a number
 * written in a comment that stops being true when somebody adds a word.
 */
export function entropyBits(): number {
  return Math.floor(WORD_COUNT * Math.log2(WORDS.length))
}

/**
 * `crypto.getRandomValues`, never `Math.random`. Rejection sampling rather
 * than a modulo, which would quietly favour the start of the list.
 */
function pick<T>(list: readonly T[]): T {
  const limit = Math.floor(0x100000000 / list.length) * list.length
  const buf = new Uint32Array(1)
  let n: number
  do {
    crypto.getRandomValues(buf)
    n = buf[0]!
  } while (n >= limit)
  return list[n % list.length]!
}

/**
 * A suggestion, hyphenated so the word boundaries survive being read aloud
 * or written down. Always comfortably past the length rule.
 */
export function suggestPassphrase(): string {
  return Array.from({ length: WORD_COUNT }, () => pick(WORDS)).join('-')
}
