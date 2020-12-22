#!/usr/bin/bash
#
# Purpose :- Starting/Stopping the GenServer process through systemd service
#            Systemd file - /lib/systemd/system/genserver.service


task="$1"

# logger function
LOG_FACILITY="local3.info"
logmaster () 
{
    logger -t genserver -p $LOG_FACILITY $1
}



# stop the genserver process
function genserver_stop()
{

# checking the genserver process status.
ps -ef | egrep -w 'node|main.js' | grep -v grep
if [ "$?" -eq 0 ]
then 
   # killing the genserver process if it is running
   PIDOF=$(ps -ef | egrep -w 'node|main.js' | grep -v grep | awk '{print $2}')
   kill -9 "$PIDOF"
   
       # checking the genserver process status
       ps -ef | egrep -w 'node|main.js' | grep -v grep
       if [ "$?" -eq 1 ]
       then
              logmaster "INFO: genserver process has been stopped"
       else 
              logmaster "INFO: genserver process could not stop"
       fi 
   
fi 
}

# start the genserver process
function genserver_start()
{
    
# checking the genserver process status.
ps -ef | egrep -w 'node|main.js' | grep -v grep
if [ "$?" -eq 0 ]
then
    logmaster "genserver process is already running in the server"

else
    cd /glb/eu/epe/data/genrem/genserver/production/server/app
    source genserver.environment
    #su  s_genrem -c "/glb/eu/epe/data/genrem/genserver/node-distribution/bin/node main.js > /dev/null 2>&1"
    nohup /glb/eu/epe/data/genrem/genserver/node-distribution/bin/node main.js > /dev/null 2>&1 &

fi 

}



# main
if [ "$task" == "start" ]
then 
     genserver_start

elif [ "$task" == "stop" ]
then
     genserver_stop
fi 

##
