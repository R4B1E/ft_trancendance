# 21-08-2025
-> add tap framework in order to deploy tests -> resulting to work with lint along with pre/post test
-> Consult chapter 5 in order to figure out how to handle serialization
-> need to figure out how to run both mongo db commands when executing the dev command
-> add more error messages in the config.hs plugin
-> Press F5 to enable debug mode in VSCODE IDE ( dev mode only )
-> Need to figure out how to add server options into the config file in the configs folder
-> need to figure out how the fck does the swagger plugin is gonna work
-> cross-origin resource sharing ( to permit the web clients to reach my endpoints )
-> Player hit the tournament button in order to launch a new one : need to keep track of how much players do i have in the back end 

# 22-08-2025
-> added the ably SDK in order to manage the different players present in the game
-> added the ably object as a decorator to the fastify instance
-> use the queryTime from auth opts instead of a NTP daemon in order to control the system clock

# 25-08-2025
-> have to add a preserializer for the id so it can match the expected input for the mongo db constructor
-> Need to figure out how to git rid of this : fastify.decorate('ActiveRooms', ActiveRooms); in the Roms/autohooks file
-> Need to work on the interface of the room stored in the database

# 26-08-2025
-> need to add join queue match making later on ... droping it for now
-> need to check if the room has reached its max players or not
-> passing to front end now in order to see how beautiful things are treated 
