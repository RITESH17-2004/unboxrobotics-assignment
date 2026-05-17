import asyncio
import os
import random
import websockets
import asyncpg
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Maintain a set of connected websocket clients
connected_clients = set()

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost:5432/speedometer")

async def sensor_loop(pool):
    """
    Simulates a sensor that reads speed every 1 second, inserts it into DB,
    and broadcasts to all connected websocket clients.
    """
    current_speed = 0.0
    while True:
        try:
            # Simulate realistic speed changes
            change = random.uniform(-5.0, 10.0)
            current_speed = max(0.0, min(160.0, current_speed + change))
            rounded_speed = round(current_speed, 1)

            # Insert to DB
            async with pool.acquire() as connection:
                record = await connection.fetchrow(
                    'INSERT INTO speed_data (speed) VALUES ($1) RETURNING id, speed, created_at',
                    rounded_speed
                )

            logger.info(f"Inserted speed: {rounded_speed}")

            # Broadcast to clients
            if connected_clients:
                message = json.dumps({
                    "id": record['id'],
                    "speed": record['speed'],
                    "created_at": record['created_at'].isoformat()
                })
                websockets.broadcast(connected_clients, message)
                
        except Exception as e:
            logger.error(f"Error in sensor loop: {e}")

        await asyncio.sleep(1)

async def handler(websocket):
    """Handle incoming websocket connections."""
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)

async def main():
    logger.info(f"Connecting to database at {DATABASE_URL}")
    
    # Wait for DB to be ready (simple retry loop)
    pool = None
    for _ in range(10):
        try:
            pool = await asyncpg.create_pool(DATABASE_URL)
            logger.info("Successfully connected to the database.")
            break
        except Exception as e:
            logger.warning(f"Database not ready yet, retrying in 2 seconds... {e}")
            await asyncio.sleep(2)
            
    if not pool:
        logger.error("Could not connect to the database. Exiting.")
        return

    # Start the websocket server
    logger.info("Starting WebSocket server on port 8765...")
    server = await websockets.serve(handler, "0.0.0.0", 8765)

    # Run the sensor loop concurrently
    sensor_task = asyncio.create_task(sensor_loop(pool))

    # Keep running until interrupted
    await asyncio.gather(
        server.serve_forever(),
        sensor_task
    )

if __name__ == "__main__":
    asyncio.run(main())
