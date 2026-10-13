import asyncio
import httpx

async def main():
    url = 'http://host.docker.internal:1234/v1/chat/completions'
    payload = {
        'model': 'medicus',
        'messages': [{'role': 'user', 'content': 'Hei'}],
        'max_tokens': 10
    }
    headers = {
        'Authorization': 'Bearer sk-lm-tia401iw:MRIY7W74tWqkZKbMaxVd',
        'Content-Type': 'application/json'
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            print('Status:', res.status_code)
            print('Body:', res.text)
    except Exception as e:
        print('Exception:', type(e), e)

if __name__ == '__main__':
    asyncio.run(main())
