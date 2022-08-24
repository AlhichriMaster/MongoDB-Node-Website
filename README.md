Author: Youssuf Hichri

File in Project: 
	cleanServerCode.js
	public: 
		add.png
		remove.png
		orderform.js
		orderform.html
	views:
		pages: 
			index.pug
			login.pug
			orderSummary.pug
			register.pug
			UserPorfile.pug
			users.pug
		partials:
			footer.pug
			header.pug
			headerLoggedOut.pug

How to Run:
	For this website to work, you need to have node installed. You will also need some extra modules that are installed using npm. Check bellow for instructions.
	1. Open the command prompt
	2. To start, type in the terminal npm init, this will create a file called package.json.
	3. To install all the modules used in this project cope and paste 3.1 in the command prompt.
	3.1 npm i express express-session pug mongodb
	4. Open another command prompt, move to the file directory. So that you're on the same level as the project file.
	5. Type in mongod --dbpath=filename (filename is the name of the file in which all the project files are in)
	6. Now on the other command prompt type in node cleanServerCode.js
	7. The server should be running now. Go to your browser and open localhost:3000


	
