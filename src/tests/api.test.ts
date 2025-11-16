import supertest from 'supertest';

const request = supertest('http://localhost:3000');


describe('GET /api/tokens', () => {

    // --- TEST 5  ---
    test('should return a list of tokens', async () => {
      const res = await request.get('/api/tokens');
  
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.totalTokens).toBeGreaterThan(0);
    });

    // --- TEST 6 ---
    test('should return tokens sorted by volume_sol descending', async () => {
        const res = await request.get('/api/tokens?sort=volume_sol&order=desc');
    
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    
        // Check if the first token has more volume than the second
        const firstToken = res.body.data[0];
        const secondToken = res.body.data[1];
        expect(firstToken.volume_sol).toBeGreaterThanOrEqual(secondToken.volume_sol);
      });
    // --- TEST 7 ---
    test('should return tokens sorted by price_24hr_change ascending', async () => {
        const res = await request.get('/api/tokens?sort=price_24hr_change&order=asc');
    
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    
        // Check if the first token has less change than the second
        const firstToken = res.body.data[0];
        const secondToken = res.body.data[1];
        expect(firstToken.price_24hr_change).toBeLessThanOrEqual(secondToken.price_24hr_change);
      });

      // --- TEST 8 ---
      test('should respect the limit parameter', async () => {
        const res = await request.get('/api/tokens?limit=5');
    
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(5);
        expect(res.body.limit).toBe(5);
      });
      // --- TEST 9--- Pagination and Cursor test
      test('should return the next page using a cursor', async () => {
        // 1. Get the first page to find a cursor
        const firstPageRes = await request.get('/api/tokens?limit=2');
        const firstPageTokens = firstPageRes.body.data;
        const nextCursor = firstPageRes.body.next_cursor;
    
        expect(nextCursor).toBeDefined();
    
        // 2. Get the second page using the cursor
        const secondPageRes = await request.get(`/api/tokens?limit=2&cursor=${nextCursor}`);
        const secondPageTokens = secondPageRes.body.data;
    
        expect(secondPageRes.status).toBe(200);
        expect(secondPageTokens.length).toBe(2);
    
        // 3. Verify the pages are different
        expect(firstPageTokens[0].token_address).not.toBe(secondPageTokens[0].token_address);
      });
      // ---TEST 10 --- (Edge Case bad sorting key)
      test('should handle an invalid sort key gracefully', async () => {
        // It should default to sorting by 'volume_sol'
        const res = await request.get('/api/tokens?sort=invalid_key');
    
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    
        // Check if it's sorted by the default (volume_sol)
        const firstToken = res.body.data[0];
        const secondToken = res.body.data[1];
        expect(firstToken.volume_sol).toBeGreaterThanOrEqual(secondToken.volume_sol);
      });
    });