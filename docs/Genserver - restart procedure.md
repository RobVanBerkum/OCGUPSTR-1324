# Genserver restart procedure

Overview of the restart procedure for the Genserver process in the Linux environment.
Prerequisites are a Linux account and the right to issue the sudo account to the functional 's_genrem' account.

## Access to the Genserver cluster node

Use the 'Leostream Connect EU' app to acces the Linux EMT cluster:

~~~bash
Username: <UserId>
Password: ******
Domain: linux.shell.com
~~~

Genserver runs on the 'amsdc2-n-sv0023' node. If not logged on to this node, issue the ssh command to that node:

~~~bash
ssh amsdc2-n-sv0023
~~~

First time connections require to accept the authenticity of the host 'amsdc2-n-sv0023'. Continue by keying in 'yes'.
The ssh utility now requests the password:

~~~bash
<UserId>@amsdc2-n-sv0023's password:
~~~

This completes the logon procedure on the Genserver node.

## Restart Genserver process procedure

Genserver runs under the `s_genrem` functional account. You need to run a shell with the associated user and group ID's (mind the spaces!):

~~~bash
sudo su - s_genrem
~~~

Issue a stop command followed by a start command

~~~bash
/glb/eu/epe/data/genrem/genserver/production/server/app/genserver.sh stop
/glb/eu/epe/data/genrem/genserver/production/server/app/genserver.sh start
~~~~

Check the correctness of the restart procedure by connecting a webbrowser to the '<http://amsdc2-n-sv0023:3001'> URL.

## Error handling

If the Genserver process still is not functioning as expected, get in touch with Shell IT Support.

Exit the s_genrem environment to return to the UserID environment:

~~~bash
exit
~~~
