import requests

res = requests.get('http://127.0.0.1:8000/api/proyectos/5/viviendas?per_page=100', headers={'Accept': 'application/json'})
print(res.json())
