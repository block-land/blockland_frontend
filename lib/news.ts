export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string[];
  category: "Ecosystem" | "Announcement" | "Development" | "Marketplace";
  imageUrl: string;
  date: string;
  readTime: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
}

export const DUMMY_NEWS: NewsItem[] = [
  {
    id: "news-001",
    title: "Blockland Launches USA Genesis Phase: The Coordinate Economy is Born",
    excerpt: "Today marks the launch of the USA Genesis phase, allowing early adopters to claim and trade Coordinate Units across the United States. Secure your landmarks today.",
    content: [
      "We are thrilled to announce the official launch of the USA Genesis phase, the first major step in bringing the Blockland coordinate economy to the world. Starting today, users can connect their Solana-compatible wallets via Privy and explore the interactive 3D map to secure Coordinate Units representing real-world locations.",
      "The coordinate economy is a novel protocol designed to map land ownership and commerce onto digital grids on-chain. Each unit represents a defined geographical boundary, allowing users to buy, sell, stake, and construct agents on their digital property.",
      "Our team has worked tirelessly to build an immersive experience that integrates high-fidelity Mapbox rendering, dynamic client-side animations, and decentralized transaction handlers. In this initial phase, only coordinates within the boundaries of the United States are available for claim.",
      "Early adopters who secure units during the Genesis phase will enjoy special staking boosts and access to premium landmark rewards. To get started, head over to the Landmark map and search for your favorite locations."
    ],
    category: "Announcement",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80",
    date: "Jul 07, 2026",
    readTime: "4 min read",
    author: {
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60",
      role: "Lead Protocol Architect"
    }
  },
  {
    id: "news-002",
    title: "Integrating Better Auth and Supabase inside Hono Runtime",
    excerpt: "A deep dive into our backend architecture upgrade. We've combined Hono's lightning-fast Bun runtime with Drizzle ORM and Better Auth for a robust user system.",
    content: [
      "Securing user data and creating a seamless login experience has always been our top priority. In this technical update, we outline the migration of our core authentication layer to Better Auth, integrated natively with Hono JS running on Bun.",
      "Better Auth provides a comprehensive set of handlers that work seamlessly with Drizzle ORM to map authentication tables directly onto our Supabase Postgres database. This setup eliminates boilerplate middleware and ensures session tokens are validated within milliseconds.",
      "By utilising Bun's native performance, our new protected endpoints (/api/user/me) can resolve active sessions 3x faster than traditional Node.js/Express stacks. Our developer API documentation will be updated next week to reflect these changes."
    ],
    category: "Development",
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&auto=format&fit=crop&q=80",
    date: "Jul 05, 2026",
    readTime: "6 min read",
    author: {
      name: "Maya Lin",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
      role: "Backend Engineer"
    }
  },
  {
    id: "news-003",
    title: "How to Bid on Coordinate Units in the New Blockland Marketplace",
    excerpt: "Learn how to use our peer-to-peer bidding system. Submit offers, review listed dates, and chat directly with sellers using the Facebook-style chat drawer.",
    content: [
      "The Blockland Marketplace has evolved. With our latest update, we are introducing a fully-featured peer-to-peer bidding and offering protocol, allowing collectors to negotiate deals directly on-chain.",
      "When viewing a coordinate unit, you will now see an 'Active Offers' list rendered inside a custom scroll area. Anyone can make an offer in USDC, which remains active for 7 days unless accepted or rejected by the seller.",
      "To make negotiations easier, we have also built a floating Chat Drawer right next to the buy box. This messenger allows buyers and sellers to communicate, negotiate prices, and receive real-time auto-replies based on current transaction history."
    ],
    category: "Marketplace",
    imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80",
    date: "Jul 02, 2026",
    readTime: "3 min read",
    author: {
      name: "Marcus Vance",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
      role: "Ecosystem Growth"
    }
  },
  {
    id: "news-004",
    title: "Ecosystem Rewards and Staking: What You Need to Know",
    excerpt: "Discover the yield dynamics of Coordinate Units. How owning strategic landmarks generates passive rewards from visitor traffic and building development.",
    content: [
      "As we approach mass adoption, understanding the underlying value accrual mechanisms of Blockland is vital. Coordinate Units are not just digital collectibles—they are yield-generating assets.",
      "Staking rewards are calculated based on two main criteria: visitor foot traffic (geocoding requests mapped to your grid unit) and building developments. If a third-party developer decides to build an application or launch an agent within your boundary, you receive a percentage fee.",
      "In Phase 2, we will launch our advanced Staking Portal where coordinate owners can lock their units to boost yields. Read our upcoming whitepaper for the complete mathematical yield breakdown."
    ],
    category: "Ecosystem",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1000&auto=format&fit=crop&q=80",
    date: "Jun 28, 2026",
    readTime: "5 min read",
    author: {
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60",
      role: "Lead Protocol Architect"
    }
  }
];

export const getCategoryBadgeColor = (category: NewsItem["category"]) => {
  switch (category) {
    case "Announcement":
      return "bg-amber-500/10 text-amber-500 border-amber-500/25";
    case "Development":
      return "bg-purple-500/10 text-purple-500 border-purple-500/25";
    case "Marketplace":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/25";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-700/50";
  }
};
