from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

print('Starting Chrome...')
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

try:
    print('Navigating to login page...')
    driver.get('https://alunos.cefet-rj.br/aluno/login.action')
    time.sleep(2)

    print('Current URL before login:', driver.current_url)

    driver.find_element(By.ID, 'j_username').send_keys('2012391GEL')
    driver.find_element(By.ID, 'j_password').send_keys('eike4147')
    driver.find_element(By.CSS_SELECTOR, '.btn.btn-primary').click()

    time.sleep(3)

    url = driver.current_url
    print('FINAL URL:', url)

    if 'login.action?error' in url:
        print('LOGIN DEFINITIVELY FAILED!')
        try:
            err = driver.find_element(By.CSS_SELECTOR, '.alert, .error, .text-danger')
            print('Error text:', err.text)
        except:
            pass
    elif 'cpa' in url:
        print('LOGIN SUCCEEDED! Intercepted by CPA. URL is:', url)
    else:
        print('LOGIN SUCCEEDED! Dashboard reached. URL is:', url)
except Exception as e:
    print('Exception:', e)
finally:
    driver.quit()
