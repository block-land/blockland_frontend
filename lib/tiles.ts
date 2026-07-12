export interface TileItem {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  price: number;
  seller: string;
  imageUrl: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  country: string;
  date: string;
  publisher: {
    name: string;
    avatar: string;
    walletAddress: string;
  };
}

export const DUMMY_TILES: TileItem[] = [
  {
    id: "tile-001",
    name: "Golden Gate Bridge Vista",
    location: "San Francisco, USA",
    coordinates: "37.8199° N, 122.4783° W",
    price: 350,
    seller: "0x7a...d3e1",
    imageUrl: "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=600&auto=format&fit=crop&q=60",
    rarity: "Legendary",
    country: "United States",
    date: "Jul 05, 2026",
    publisher: {
      name: "SolanaCrusader",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x7a8b...d3e1",
    },
  },
  {
    id: "tile-002",
    name: "Central Park West 72nd",
    location: "New York, USA",
    coordinates: "40.7785° N, 73.9738° W",
    price: 280,
    seller: "0x9f...a89c",
    imageUrl: "https://images.unsplash.com/photo-1522083165195-342750297f05?w=600&auto=format&fit=crop&q=60",
    rarity: "Epic",
    country: "United States",
    date: "Jul 04, 2026",
    publisher: {
      name: "BlockLord",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x9f3c...a89c",
    },
  },
  {
    id: "tile-003",
    name: "Hollywood Sign Peak",
    location: "Los Angeles, USA",
    coordinates: "34.1341° N, 118.3215° W",
    price: 190,
    seller: "0x2b...ff54",
    imageUrl: "https://images.unsplash.com/photo-1581012739307-3def625ae67e?w=600&auto=format&fit=crop&q=60",
    rarity: "Rare",
    country: "United States",
    date: "Jul 02, 2026",
    publisher: {
      name: "CryptoExplorer",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x2b8a...ff54",
    },
  },
  {
    id: "tile-004",
    name: "Grand Canyon Rim View",
    location: "Arizona, USA",
    coordinates: "36.0544° N, 112.1401° W",
    price: 150,
    seller: "0x4c...82ea",
    imageUrl: "https://images.unsplash.com/photo-1615551043360-33de8b5f410c?w=600&auto=format&fit=crop&q=60",
    rarity: "Rare",
    country: "United States",
    date: "Jun 30, 2026",
    publisher: {
      name: "GeoMapper",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x4c9e...82ea",
    },
  },
  {
    id: "tile-005",
    name: "Las Vegas Strip Core",
    location: "Nevada, USA",
    coordinates: "36.1147° N, 115.1728° W",
    price: 420,
    seller: "0xea...890b",
    imageUrl: "https://images.unsplash.com/photo-1524008279394-3aed4073ab30?w=600&auto=format&fit=crop&q=60",
    rarity: "Legendary",
    country: "United States",
    date: "Jun 28, 2026",
    publisher: {
      name: "VegasWhale",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0xeacf...890b",
    },
  },
  {
    id: "tile-006",
    name: "Miami South Beach",
    location: "Florida, USA",
    coordinates: "25.7781° N, 80.1313° W",
    price: 120,
    seller: "0x12...55ad",
    imageUrl: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=600&auto=format&fit=crop&q=60",
    rarity: "Common",
    country: "United States",
    date: "Jun 25, 2026",
    publisher: {
      name: "BeachBum",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x12a9...55ad",
    },
  },
];

export const getRarityBadgeColor = (rarity: TileItem["rarity"]) => {
  switch (rarity) {
    case "Legendary":
      return "bg-amber-500/10 text-amber-500 border-amber-500/25";
    case "Epic":
      return "bg-purple-500/10 text-purple-500 border-purple-500/25";
    case "Rare":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/25";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-700/50";
  }
};
