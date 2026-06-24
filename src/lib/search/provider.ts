/**
 * Search Provider Abstraction Layer
 *
 * Decouples the application from any specific search engine.
 * Currently wraps MongoDB full-text search.
 * Future: swap for Elasticsearch, Typesense, Meilisearch, or Atlas Search
 * by implementing a new SearchProvider and updating getSearchProvider().
 */

export type SearchHit = {
  id: string;
  score?: number;
  highlight?: string;
};

export type SearchOptions = {
  tenantId: string;
  query: string;
  limit?: number;
  filters?: Record<string, unknown>;
};

export interface SearchProvider {
  name: string;
  searchConversations(options: SearchOptions): Promise<SearchHit[]>;
  searchMessages(options: SearchOptions): Promise<SearchHit[]>;
  isHealthy(): Promise<boolean>;
}

/**
 * MongoDB full-text search provider.
 * Fulfils the SearchProvider contract using Mongoose text indexes.
 */
import { Conversation, Message } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";

class MongoSearchProvider implements SearchProvider {
  name = "mongodb";

  async searchConversations(options: SearchOptions): Promise<SearchHit[]> {
    await connectToDatabase();
    const limit = Math.min(options.limit ?? 30, 100);

    const results = await Conversation.find(
      {
        tenantId: options.tenantId,
        $text: { $search: options.query },
        ...options.filters,
      },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .select("_id")
      .lean();

    return results.map((r) => ({
      id: r._id.toString(),
      score: (r as any).score,
    }));
  }

  async searchMessages(options: SearchOptions): Promise<SearchHit[]> {
    await connectToDatabase();
    const limit = Math.min(options.limit ?? 30, 100);

    const results = await Message.find(
      {
        tenantId: options.tenantId,
        $text: { $search: options.query },
        ...options.filters,
      },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .select("_id conversationId")
      .lean();

    return results.map((r) => ({
      id: r._id.toString(),
      score: (r as any).score,
    }));
  }

  async isHealthy(): Promise<boolean> {
    try {
      await connectToDatabase();
      return true;
    } catch {
      return false;
    }
  }
}

let _provider: SearchProvider | null = null;

/**
 * Returns the active search provider.
 * Swap the returned implementation here when migrating to a different engine.
 */
export function getSearchProvider(): SearchProvider {
  if (!_provider) {
    _provider = new MongoSearchProvider();
  }
  return _provider;
}
