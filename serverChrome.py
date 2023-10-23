from selenium import webdriver
from subprocess import Popen
from time import sleep
import os

def main():
    abspath = os.path.abspath(__file__) # moves to location of script so you don't have to run in folder
    dname = os.path.dirname(abspath)
    os.chdir(dname)
    p = Popen(["python", "-m", "http.server"]) # start the http server
    options = webdriver.ChromeOptions()
    options.add_experimental_option("excludeSwitches" , ["enable-automation", "enable-logging"])
    options.add_argument("--guest")
    options.add_argument("start-maximized")
    browser = webdriver.Chrome(options=options)
    browser.get("http://localhost:8000//main.html") # change main.html to your filename
    while(1):
        try:
            browser.current_url # tries to see current url of browser, will throw exception if browser is closed
            sleep(1) # save some resources
        except:
            break
    print("Browser closed! Closing server...")
    Popen.terminate(p) # close the http server

if __name__ == '__main__':
    main()