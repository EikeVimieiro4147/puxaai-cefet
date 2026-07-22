import requests
session = requests.session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
})
res1 = session.post('https://cpa.cefet-rj.br/aluno/j_security_check', data={'j_username': '2012391gel', 'j_password': 'eike4147'})
print('res1 status:', res1.status_code)
print('res1 url:', res1.url)
print('res1 cookies:', session.cookies.get_dict())
if 'id="menu"' in res1.text or "id='menu'" in res1.text:
    print('MENU FOUND ON CPA DOMAIN!')
else:
    print('NOT FOUND ON CPA')
