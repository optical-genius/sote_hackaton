import asyncio

TARGET_HOST = "172.19.16.1"
TARGET_PORT = 1234
LISTEN_PORT = 1234

async def pipe(reader, writer):
    try:
        while not reader.at_eof():
            data = await reader.read(4096)
            if not data:
                break
            writer.write(data)
            await writer.drain()
    except Exception:
        pass
    finally:
        writer.close()

async def handle_client(client_reader, client_writer):
    try:
        target_reader, target_writer = await asyncio.open_connection(TARGET_HOST, TARGET_PORT)
        await asyncio.gather(
            pipe(client_reader, target_writer),
            pipe(target_reader, client_writer)
        )
    except Exception as e:
        print("Forwarder connect error:", e)
        client_writer.close()

async def main():
    server = await asyncio.start_server(handle_client, "0.0.0.0", LISTEN_PORT)
    print(f"TCP Forwarder running on 0.0.0.0:{LISTEN_PORT} -> {TARGET_HOST}:{TARGET_PORT}")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
