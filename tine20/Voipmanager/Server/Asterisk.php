<?php
/**
 * Tine 2.0
 * 
 * @package     Voipmanager
 * @subpackage  Server
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @copyright   Copyright (c) 2009-2011 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Lars Kneschke <l.kneschke@metaways.de>
 * 
 */

/**
 * Asterisk Server class with handle() function
 * 
 * @package     Voipmanager
 * @subpackage  Server
 */
class Voipmanager_Server_Asterisk implements Tinebase_Server_Interface
{
    /**
     * handler for command line scripts
     * 
     * @return boolean
     */
    public function handle()
    {
        Tinebase_Core::initFramework();
        
        if (Tinebase_Core::isLogLevel(Zend_Log::DEBUG)) Tinebase_Core::getLogger()->debug(
            __METHOD__ . '::' . __LINE__ .' is Asterisk curl request: ' . print_r($_REQUEST, true));
        
        if (Tinebase_Controller::getInstance()->login($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'], $_SERVER['REMOTE_ADDR'], 'TineAsterisk') === true) {
            $server = new Tinebase_Http_Server();
            $server->setClass('Voipmanager_Frontend_Asterisk_SipPeers',    'Voipmanager_SipPeers');
            $server->setClass('Voipmanager_Frontend_Asterisk_SipRegs',     'Voipmanager_SipRegs');
            $server->setClass('Voipmanager_Frontend_Asterisk_CallForward', 'Voipmanager_CallForward');
            $server->setClass('Voipmanager_Frontend_Asterisk_MeetMe',      'Voipmanager_MeetMe');
            
            $_REQUEST['method'] = $this->getRequestMethod();

            $server->handle($_REQUEST);

            Tinebase_Controller::getInstance()->logout($_SERVER['REMOTE_ADDR']);
        } else {
            if (Tinebase_Core::isLogLevel(Zend_Log::DEBUG)) Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ .' auth failed ');
        }
    }
    
    /**
    * returns request method
     *
    * @return string
    */
    public function getRequestMethod()
    {
        list($class, $method) = explode('.', $_REQUEST['method']);
        // ugly hack to parse requests from res_config_curl
        if ($method == 'handleResConfig') {
            // set method to a usefull value
            $pos = strpos($_REQUEST['action'], '?');
            if($pos !== false) {
                $action = substr($_REQUEST['action'], 0, $pos);
                list($key, $value) = explode('=', substr($_REQUEST['action'], $pos+1));
                $_REQUEST[$key] = $value;
            } else {
                $action = $_REQUEST['action'];
            }
            $method = ucfirst(substr($action, 1));
            $result = $class . '.handle' . $method;
        } else {
            $result = $_REQUEST['method'];
        }
        
        return $result;
    }
}
