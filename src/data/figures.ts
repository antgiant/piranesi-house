// The wider cast of the House's statues: the trades, people, creatures, tales, and made things that a sculptor working in
// the long classical tradition (antiquity to about the end of the eighteenth century) might have been asked to carve.
// Nothing later than that: no engines, no electricity, no modern weapons, no modern professions.
//
// One figure per line. A trailing marker sets the kind: #a animal, #m mythic (spirits, gods, monsters), #o a made thing
// (vehicle, weapon, tool, building, instrument); no marker means a person or group of people. `~theme,theme` adds more
// themes. All of this is our own list of subjects; it is not taken from any book.

import type { Figure, Kind, Theme } from './catalogue';

const KINDS: Record<string, Kind> = { a: 'animal', m: 'mythic', o: 'object' };

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parse(primary: Theme, block: string): Figure[] {
  return block.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    let rest = line;
    let extra: Theme[] = [];
    const tilde = rest.indexOf('~');
    if (tilde >= 0) { extra = rest.slice(tilde + 1).split(',').map((t) => t.trim()) as Theme[]; rest = rest.slice(0, tilde); }
    let kind: Kind = 'human';
    const m = /#([amo])$/.exec(rest);
    if (m) { kind = KINDS[m[1] as string] as Kind; rest = rest.slice(0, m.index); }
    const label = rest.trim();
    return { id: slug(label), label, themes: [primary, ...extra], kind };
  });
}

const BLOCKS: [Theme, string][] = [
['pastoral', `
beekeeper
sheep-shearer
thresher with a flail
haymaker
gleaner bending to the stubble
swineherd
cowherd
falconer~courtly
gamekeeper
woodcutter
charcoal-burner
hedge-layer
harvest bride with a sheaf
wheat-binder
cider-presser
cheese-maker
mushroom gatherer
hop-picker
shepherdess with a crook
dairy girl with a pail
old farmer leaning on a spade
farm boy with a lamb
goose-girl
egg-wife with a basket
sower scattering seed
wine-treader
olive-gatherer
reaper resting at noon
vintner tasting
miller with a sack
well-digger
fence-builder
herb-woman
orchard-keeper pruning
scarecrow#o
ox-team at the plough#o~beasts
loaded haywain#o~travel
millstone#o
beehive on a stand#o
wine-press#o
sickle and sheaf#o
harvest festival dancers
the last sheaf carried home
plough-boy and his horse
shepherd asleep beneath a tree
`],
['maritime', `
ship's carpenter
cabin boy
ship's cook
lookout in the rigging
pilot with a lead-line
navigator with a quadrant
whaler with a harpoon
oyster-gatherer
salt-raker
ferryman
lighthouse-keeper~craft
boatbuilder~craft
rope-maker~craft
sail-maker~craft
caulker with a mallet~craft
pearl diver
sponge diver
shell-gatherer on the shore
harbour pilot
customs-officer on the quay
shipwrecked sailor clinging to a spar
drowned sailor borne by dolphins
fishwife with a basket
galley slave at the oar
admiral on a quarterdeck~civic
captain at the wheel
mariner's widow watching the sea
mermaids combing their hair#m
sea-serpent coiled about a ship#m
kraken rising#m
the whale#a
galleon under full sail#o~travel
merchant cog#o~trade
rowing galley#o~travel
fishing smack#o
ship's anchor#o
ship's wheel#o
ship's figurehead#o
capstan#o
lighthouse#o
sea-chest#o
longboat#o
barge on a canal#o~travel
raft of logs#o
net hung to dry#o
sailors hauling a rope together
the harbour bell#o
`],
['scholarly', `
alchemist
herbalist
apothecary
surgeon
anatomist
midwife
chemist at a furnace
mathematician at a slate
surveyor with a chain
printer at the press~craft
bookbinder~craft
copyist
illuminator
calligrapher
paper-maker~craft
schoolmaster with a cane
schoolchild with a slate
student asleep over a book
translator
chronicler
poet crowned with bay
playwright
historian
natural philosopher with a prism
botanist with a pressed flower
collector with a cabinet
explorer's mapmaker
physician taking a pulse
the dissected body
lecturer at a lectern
a debate between two scholars
monk copying a manuscript~sacred
musician composing
clock-maker~craft
instrument-maker~craft
astronomer's assistant
geographer with a globe
orrery#o
astrolabe#o
armillary sphere#o
terrestrial globe#o
telescope on a tripod#o
open book on a lectern#o
quill and inkwell#o
printing press#o~craft
hourglass of stone#o
library ladder#o
anatomical model#o
the scales of learning#o
stack of folios#o
`],
['martial', `
pikeman
halberdier
crossbowman
musketeer
dragoon
cavalry trumpeter
gunner at a cannon
sapper
siege-engineer
quartermaster
surgeon of the army
wounded soldier supported by a comrade
sentry asleep at his post
cadet
drill-sergeant
general on horseback
conqueror in a triumphal chariot
gladiator
centurion
legionary with a shield
hoplite
charioteer
slinger
javelin-thrower
fencing-master
duellist
knight in full armour
squire carrying a helm
knight kneeling at a vigil
crusader
mounted knight at a tournament
herald of arms
war-drummer
bugler
fortress guard
veteran with a crutch
spy with a hooded lantern
cannon on its carriage#o
mortar#o
catapult#o
trebuchet#o
ballista#o
battering ram#o
siege tower#o
longbow#o
crossbow#o
halberd#o
long infantry pike#o
broadsword#o
rapier#o
dagger#o
mace#o
war-hammer#o
battle-axe#o
round shield#o
tall shield#o
helm with a plume#o
empty suit of armour#o
breastplate and gauntlets#o
battle standard#o
war-drum#o
war-trumpet#o
flintlock musket#o
flintlock pistol#o
powder keg#o
pyramid of cannonballs#o
quiver of arrows#o
war-chariot#o~travel
war-elephant with a tower#a
war-horse in barding#a
fortress gate#o
siege ladder#o
the broken sword#o
the laurel for the victor#o
`],
['beasts', `
elephant#a
rhinoceros#a
hippopotamus#a
giraffe#a
leopard#a
tiger#a
panther#a
fox#a
hare#a
rabbit#a
squirrel#a
badger#a
otter#a
beaver#a
bat#a
hedgehog#a
goose#a
duck#a
peacock#a
pelican#a
eagle#a
hawk#a
falcon#a
vulture#a
raven#a
crow#a
dove#a
nightingale#a
lark#a
kingfisher#a
stork#a
cockerel#a
hen with chicks#a
parrot#a
monkey#a
ape#a
bull#a
cow#a
calf#a
goat#a
kid#a
sheep#a
lamb#a
pig#a
donkey#a
mule#a
cat#a
kitten#a
mouse#a
greyhound#a
mastiff#a
spaniel#a
dolphin#a
whale#a
seal#a
tortoise#a
frog#a
toad#a
crocodile#a
lizard#a
salamander#a
eel#a
carp#a
pike#a
octopus#a
crab#a
lobster#a
snail#a
bee#a
butterfly#a
dragonfly#a
spider#a
scorpion#a
cricket#a
moth#a
bear cub#a
wolf with her cubs#a
fawn#a
foal#a
stallion#a
mare and foal#a
white horse#a
dromedary#a
buffalo#a
lynx#a
weasel#a
mole#a
ostrich#a
flamingo#a
cormorant#a
albatross#a
gull#a
sparrow#a
owlet#a
swallow#a
thrush#a
two fighting stags#a
lion and lamb lying down together#a
the wounded lioness#a
hounds pulling down a stag#a
`],
['mythic', `
minotaur#m
faun#m
nymph#m
naiad#m
nereid#m
oread#m
harpy#m
fury#m
gorgon#m
hydra#m
three-headed hound#m
phoenix#m
winged horse#m
unicorn#m
dragon#m
basilisk#m
wyvern#m
roc#m
werewolf#m
titan holding up the sky#m
the chained fire-bringer#m
hero strangling a lion#m
hero and the many-headed serpent#m
hero holding the severed head of a gorgon#m
hero lost in a maze#m
minstrel with a lyre who charmed the beasts#m
archer-god#m
huntress-goddess#m
war-god#m
love-goddess#m
messenger-god with winged heels#m
sea-god with a trident#m
thunder-god#m
queen of the gods#m
goddess of wisdom with an owl#m
smith-god at his forge#m~craft
goddess of the harvest#m
wine-god in a chariot drawn by leopards#m
goat-footed piper god#m
goddess of the flowers#m
lord of the dead#m
goddess of spring and her return#m
goddess of the crossroads#m
the three fates#m
the three graces#m
muse of history#m
muse of tragedy#m
muse of comedy#m
muse of dance#m
muse of the lyre#m
muse of the flute#m
muse of the heavens#m
muse of hymns#m
muse of epic poetry#m
the four winds#m
the four elements#m
spirit of spring#m
spirit of summer#m
spirit of autumn#m
spirit of winter#m
river-spirit pouring from an urn#m
spirit of the spring#m
tree-spirit emerging from bark#m
house-spirit#m
spirit of the hearth#m
spirit of the well#m
the sleeping giant#m
the rising giant#m
horned giants pushing#m
hundred-handed giant#m
sea-horse and rider#m
water-sprite#m
fire-sprite#m
air-sprite#m
earth-sprite#m
the sphinx's riddle#m
two-faced figure#m
many-eyed watcher#m
four-faced figure#m
a god of boundaries#m
`],
['allegorical', `
figure of Courage
figure of Faith
figure of Charity
figure of Wisdom
figure of Truth
figure of Peace
figure of War
figure of Plenty
figure of Famine
figure of Wealth
figure of Poverty
figure of Pride
figure of Envy
figure of Sloth
figure of Anger
figure of Desire
figure of Hunger
figure of Thirst
figure of Sleep
figure of Death
figure of Youth
figure of Old Age
figure of Beauty
figure of Folly
figure of Fame
figure of Victory
figure of Liberty
figure of Industry
figure of Commerce
figure of Learning
figure of Music
figure of Painting
figure of Sculpture
figure of Architecture
figure of Navigation
figure of Agriculture
figure of Medicine
figure of Astronomy
figure of Geometry
figure of Rhetoric
figure of Grammar
figure of Dawn
figure of Evening
figure of Spring
figure of Summer
figure of Autumn
figure of Winter
figure of the Sea
figure of the Earth
figure of the Four Ages
figure of the Five Senses
figure of Sight
figure of Hearing
figure of Touch
figure of Taste
figure of Smell
figure of Gratitude
figure of Patience under the yoke
the triumph of Time over Beauty
Truth borne up by Time
Justice with the sword laid down
Envy gnawing its own heart
Fortune on her wheel#o
the wheel of the year#o
the tree of the seasons#o
the ladder of the virtues#o
the scales of the soul#o
`],
['craft', `
cooper
cartwright
wheelwright
tanner
saddler
cobbler
tailor
seamstress
embroiderer
lace-maker
hatter
glover
furrier
chandler
candle-maker
tinker mending a pot
pewterer
goldsmith
silversmith
jeweller
coppersmith
blacksmith shoeing a horse
farrier
locksmith
clockmaker
armourer
bowyer
fletcher
shipwright's apprentice
stone-cutter
sculptor at a block
bricklayer
roofer on a ladder
plasterer
painter at an easel
fresco-painter on a scaffold
stained-glass maker
organ-builder
violin-maker
harp-maker
bell-ringer
thatcher
basket-weaver
rope-walker
spinner at the wheel
carder
fuller
felt-maker
dyer's boy
brewer
baker with a peel
miller's boy
butcher
fishmonger
cook at a hearth
pastry-cook
confectioner
vintner
cellarman
lamplighter
chimney-sweep
water-carrier
well-keeper
ratcatcher
rag-and-bone man
cabinet-maker
turner at a lathe
joiner
bookseller's apprentice
sawyer in a pit
tiler
potter's wheel#o
loom#o
spinning-wheel#o
anvil and hammer#o
forge bellows#o
mason's trowel and plumb-line#o
carpenter's bench#o
lathe#o
bell on a frame#o
the great kiln#o
bellows#o
cobbler's last#o
grindstone#o
barrel#o
cauldron#o
tools laid out on a bench#o
`],
['courtly', `
emperor
empress
duke
duchess
count
countess
regent
heir to the throne
child king
queen mother
courtier bowing
lady-in-waiting
maid of honour
page carrying a train
chamberlain
treasurer
seneschal
steward with a staff
huntsman with a horn
master of the horse
court painter
court musician
harpist
viol-player
singer
fool with bells
mummer
masquerader
dancing master
fencing partner
lover at a window
lovers parting
bride
groom
widow in veils
old nobleman
tutor and young prince
queen at her embroidery
king at his chess
the coronation
the royal procession
the royal hunt
throne#o
crown on a cushion#o
sceptre and orb#o
canopy of state#o
banqueting table#o
harp#o
lute#o
viol#o
organ#o~sacred
harpsichord#o
tambourine#o
the curtain#o
`],
['celestial', `
the sun#m
the moon#m
the morning star#m
the evening star#m
the comet#m
the eclipse#m
the north star#m
the planets in procession#m
the bear and the hunter among the stars#m
the ram among the stars#m
the twin fishes among the stars#m
the archer among the stars#m
the scales among the stars#m
the water-bearer among the stars#m
the virgin among the stars#m
the lion among the stars#m
the bull among the stars#m
the crab among the stars#m
the scorpion among the stars#m
the goat-fish among the stars#m
the great dipper#o
the cloud-bearer#m
the rain-spirit#m
the thunder-spirit#m
the rainbow bridge#o
the dream-bringer#m
the angel of the morning#m
the angel of the evening#m
the sleeping angel#m
the weeping angel#m
the guardian angel and a child#m
the trumpeting angel#m
the fiery seraph#m
the many-winged seraph#m
the wheel of many eyes#m
the ladder of angels#m
the falling star#m
the shepherd of the stars
the lamplighter of the stars
the keeper of the sky-gate
`],
['sacred', `
prophet
prophetess
patriarch
matriarch
shepherd-king
the first man and woman
the man who built the ark
the lawgiver with tablets
the man in the lions' den
the woman at the well
the widow's mite
the good shepherd
the sower in the parable
the prodigal son returning
the pilgrim
the hermit
the anchorite
the nun
the monk
the abbot
the friar with a begging bowl
the bishop
the cardinal
the pope
the preacher
the choirboy
the acolyte
the sexton
the gravedigger
the confessor
the mourner
the saint with a lion
the saint with a wheel
the saint carrying a child across a river
the saint with a lamb
the saint with arrows
the saint with a book and a pen
the saint with a skull
the saint at prayer in a cave
the saint feeding the poor
the martyr
the penitent
the missionary
the beggar at the church door
the pilgrims at a shrine
the procession of the host
the baptism
the burial
the wedding at the church door
the lamb on the book#a
the dove descending#a
the fish and the loaves#o
the altar#o
the font#o
the chalice#o
the censer#o
the cross#o
the church bell#o
the reliquary#o
the candle-stand#o
the open door of the sepulchre#o
the pulpit#o
the shrine by the roadside#o
`],
['trade', `
merchant weighing coin
moneylender
banker at a counting-table
accountant
clerk at a high desk
notary
lawyer
judge
magistrate
juror
witness
prisoner in chains
gaoler
bailiff
tax-collector
auctioneer
pedlar with a pack
market-woman
stallholder
grocer
spice-merchant
cloth-merchant
wine-merchant
corn-factor
horse-dealer
cattle-drover
carrier with a barrow
porter bent under a load
dockhand rolling a cask
shopkeeper
innkeeper
tapster
chambermaid
street-seller of pies
ballad-singer
newsvendor
matchmaker
midwife on a night call
undertaker
physician in a plague mask
barber-surgeon
dentist
quack on a stage
fortune-teller
showman with a bear
puppeteer
juggler
acrobat
street musician
clown
strong man lifting a weight
conjuror
actors on a cart
the card-players
the dice-players
the chess-players
the gamblers
the beggar
the poor family
the debtor
the thief caught
the pickpocket
the coin-scale#o
the strongbox#o
the ledger#o
the market-stall#o
the shop-sign#o
the tavern-sign#o
the gibbet#o
the stocks#o
the pillory#o
the court bench#o
the town crier's bell#o
the weights and measures#o
the heap of coins#o
the barrel of wine#o
`],
['civic', `
mayor
town councillor
alderman
town clerk
beadle
watchman with a lantern
night-watchman calling the hours
town crier
constable
magistrate's clerk
guild-master
guildsman with a banner
apprentice taking an oath
the sworn oath
the founders of the city
the builder of the bridge
the builder of the wall
the builders of the cathedral
the architect with a plan
the engineer with a compass
the road-mender
the street-sweeper
the fire-fighter with a bucket
the bucket chain
the plague-doctor
the plague victims
the relief of the poor
the school-founder
the hospital-founder
the library-founder
the benefactor
the orphans
the foundling
the widow and her children
the old soldiers' home
the town's patron
the city's gates
the market square
the bridge#o
the fountain#o
the well#o
the aqueduct#o
the city gate#o
the town hall clock#o
the obelisk#o
the column#o
the triumphal arch#o
the tower of the city#o
the city's walls#o
the milestone#o
the sundial#o
the weathervane#o
the sewer-grate#o
the lamp-post of oil#o
the stone steps#o
the paved road#o
`],
['household', `
mother with a baby
father teaching a child to walk
grandmother knitting
grandfather telling a story
the sleeping child
the child with a hoop
the child with a kite
the child with a top
the child with a doll
the child with a toy boat
children playing leapfrog
children at a game of marbles
children on a seesaw
children in a ring dance
boy with a bird in a cage
girl with a kitten
girl with a skipping-rope
boy reading under a tree
girl sewing a sampler
twins asleep
siblings quarrelling
siblings sharing a loaf
a mother and her many children
a family at table
a family praying
the wedding feast
the christening
the lullaby
the washing-day
the baking-day
the spring cleaning
the cat on the hearth#a
the dog at the door#a
the cradle#o
the rocking-chair#o
the hearth#o
the kitchen table#o
the pot on the fire#o
the broom#o
the spinning-chair#o
the wardrobe#o
the bed with curtains#o
the clock on the shelf#o
the mirror on the wall#o
the candlestick#o
the key on a hook#o
the well-bucket#o
the cooking-pot#o
the pair of shoes by the door#o
the window with a flowerpot#o
the basket of eggs#o
the doll#o
the rocking horse#o
the spinning top#o
the kite#o
`],
['fable', `
the fox and the crow
the fox and the grapes
the tortoise and the hare
the crow and the pitcher
the lion and the mouse
the wolf and the lamb
the boy who cried wolf
the miller, his son and the donkey
the goose that laid the golden eggs
the ant and the grasshopper
the town mouse and the country mouse
the frog who wished to be king
the dog and its reflection
the stork and the fox with two dishes
the crane and the heron
the wind and the sun
the oak and the reed
the lion's share
the shepherd and the sea
the fisherman and the genie in the jar
the wise fool
the three wishes
the clever tailor
the giant-killer
the girl with a red hood
the beauty and the beast
the swan-maiden
the frog prince
the sleeping princess
the girl in the glass slipper
the boy who climbed the stalk
the pied piper and the children
the old woman in a shoe
the king in the pie
the dish that ran away
the cat in boots
the hero of a thousand tricks
the thief of the lamp
the sailor of the seven voyages
the man in the moon
the knight errant tilting at a windmill
the squire on his donkey
the outlaw of the greenwood
the hermit-wizard
the witch with a broom
the fairy at the window
the elf in a flower
the goblin under a stone
the troll beneath a bridge
the giant asleep on a hill
the dragon on its hoard
the dragon-slayer
the queen of the fairies
the king beneath the mountain
the ghost in a sheet
the wishing-well#o
the enchanted mirror#o
the golden apple#o
the glass slipper#o
the magic lamp#o
the spinning-wheel of the sleeping princess#o
the cauldron of the witch#o
the seven-league boots#o
the magic carpet#o~travel
the singing bone#o
the singing tree#o
the golden key#o
`],
['travel', `
traveller on foot with a staff
pilgrim on the road
post-rider with a horn
mail-coach driver
coachman
postilion
groom at the stirrup
stable-boy
ostler
toll-keeper
bridge-keeper
ferryman at a river crossing
wayfarer asleep by the road
tinker with a cart
caravan-driver leading a camel
camel-train#a
merchant of far lands
explorer with a spyglass
mountaineer with a rope
guide at a pass
shepherd on a mountain road
bargeman poling a canal
hunter in the snow
runner with a message
courier with a satchel
the lost traveller
the tired mule#a
sedan chair with its bearers#o
coach and four#o
mail-coach#o
farm cart#o
sleigh#o
sledge with dogs#o
wheelbarrow#o
palanquin#o
litter#o
pack-saddle#o
saddle and bridle#o
stirrup#o
horseshoe#o
travelling trunk#o
signpost at a crossroads#o
milestone with a hand pointing#o
rope bridge#o
stepping-stones#o
mountain hut#o
lantern on a pole#o
hot-air balloon#o
raft on a river#o
gondola#o
covered wagon#o
sailing barge#o
stage-coach in a storm#o
cart with a broken wheel#o
`],
];

export const EXTRA_FIGURES: readonly Figure[] = BLOCKS.flatMap(([t, b]) => parse(t, b));
