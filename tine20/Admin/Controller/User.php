<?php
/**
 * Tine 2.0
 *
 * @package     Admin
 * @subpackage  Controller
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Philipp Schuele <p.schuele@metaways.de>
 * @copyright   Copyright (c) 2007-2010 Metaways Infosystems GmbH (http://www.metaways.de)
 * @version     $Id$
 * 
 * @todo        catch error (and show alert) if postfix email already exists
 * @todo        extend Tinebase_Controller_Record_Abstract
 */

/**
 * User Controller for Admin application
 *
 * @package     Admin
 */
class Admin_Controller_User extends Tinebase_Controller_Abstract
{
	/**
	 * @var Tinebase_User_Abstract
	 */
	protected $_userBackend = NULL;
	
	/**
	 * @var Tinebase_SambaSAM_Ldap
	 */
	protected $_samBackend = NULL;

    /**
     * @var bool
     */
    protected $_manageImapEmailUser = FALSE;
    
    /**
     * @var bool
     */
    protected $_manageSmtpEmailUser = FALSE;
    
    /**
     * @var Tinebase_EmailUser_Abstract
     */
    protected $_imapUserBackend = NULL;

    /**
     * @var Tinebase_EmailUser_Abstract
     */
    protected $_smtpUserBackend = NULL;

    /**
     * the constructor
     *
     * don't use the constructor. use the singleton 
     */
    private function __construct() 
    {
        $this->_currentAccount = Tinebase_Core::getUser();        
        $this->_applicationName = 'Admin';
		
        $this->_userBackend = Tinebase_User::getInstance();
    }

    /**
     * don't clone. Use the singleton.
     *
     */
    private function __clone() 
    {        
    }

    /**
     * holds the instance of the singleton
     *
     * @var Admin_Controller_User
     */
    private static $_instance = NULL;

    /**
     * the singleton pattern
     *
     * @return Admin_Controller_User
     */
    public static function getInstance() 
    {
        if (self::$_instance === NULL) {
            self::$_instance = new Admin_Controller_User;
        }
        
        return self::$_instance;
    }

    /**
     * get list of full accounts -> renamed to search full users
     *
     * @param string $_filter string to search accounts for
     * @param string $_sort
     * @param string $_dir
     * @param int $_start
     * @param int $_limit
     * @return Tinebase_Record_RecordSet with record class Tinebase_Model_FullUser
     */
    public function searchFullUsers($_filter, $_sort = NULL, $_dir = 'ASC', $_start = NULL, $_limit = NULL)
    {
        $this->checkRight('VIEW_ACCOUNTS');
        
        $result = $this->_userBackend->getUsers($_filter, $_sort, $_dir, $_start, $_limit, 'Tinebase_Model_FullUser');
        
        return $result;
    }
    
    /**
     * count users
     *
     * @param string $_filter string to search user accounts for
     * @return int total user count
     */
    public function searchCount($_filter)
    {
        $this->checkRight('VIEW_ACCOUNTS');
        
        $users = $this->_userBackend->getUsers($_filter);
        $result = count($users);
        
        return $result;
    }
    
    /**
     * get account
     *
     * @param   string  $_accountId  account id to get
     * @return  Tinebase_Model_FullUser
     */
    public function get($_userId)
    {        
        $this->checkRight('VIEW_ACCOUNTS');
        
        $user = $this->_userBackend->getUserById($_userId, 'Tinebase_Model_FullUser');
        
        #// add email user data here
        #$user->emailUser = $this->_getEmailUser($user);
        
        return $user;
    }
    
    /**
     * set account status
     *
     * @param   string $_accountId  account id
     * @param   string $_status     status to set
     * @return  array with success flag
     */
    public function setAccountStatus($_accountId, $_status)
    {
        $this->checkRight('MANAGE_ACCOUNTS');
        
        $result = $this->_userBackend->setStatus($_accountId, $_status);
        
        return $result;
    }
    
    /**
     * set the password for a given account
     *
     * @param  Tinebase_Model_FullUser  $_account the account
     * @param  string                   $_password the new password
     * @param  string                   $_passwordRepeat the new password again
     * @param  bool                     $_mustChange
     * @return void
     * 
     * @todo add must change pwd info to normal tine user accounts
     */
    public function setAccountPassword(Tinebase_Model_FullUser $_account, $_password, $_passwordRepeat, $_mustChange = null)
    {
        $this->checkRight('MANAGE_ACCOUNTS');
        
        if ($_password != $_passwordRepeat) {
            throw new Admin_Exception("Passwords don't match.");
        }
        
        $this->_userBackend->setPassword($_account, $_password, true, $_mustChange);
        
        Tinebase_Core::getLogger()->info(
            __METHOD__ . '::' . __LINE__ . 
            ' Set new password for user ' . $_account->accountLoginName . '. Must change:' . $_mustChange
        );
    }
    
    /**
     * update user
     *
     * @param  Tinebase_Model_FullUser 	$_user 		  	  the user
     * @param  string 					$_password 		  the new password
     * @param  string 					$_passwordRepeat  the new password again
     * 
     * @return Tinebase_Model_FullUser
     */
    public function update(Tinebase_Model_FullUser $_user, $_password, $_passwordRepeat)
    {
        $this->checkRight('MANAGE_ACCOUNTS');
        
        $oldUser = $this->_userBackend->getUserByProperty('accountId', $_user, 'Tinebase_Model_FullUser');
        
        $transactionId = Tinebase_TransactionManager::getInstance()->startTransaction(Tinebase_Core::getDb());
        
        if ($_user->visibility == Tinebase_Model_User::VISIBILITY_DISPLAYED && empty($_user->container_id)) {
            $_user->visibility = Tinebase_Model_User::VISIBILITY_HIDDEN;
        }
        
        if (Tinebase_Application::getInstance()->isInstalled('Addressbook') === true && ! empty($_user->container_id)) {
            $_user->contact_id = $oldUser->contact_id;
            $contact = $this->createOrUpdateContact($_user);
            $_user->contact_id = $contact->getId();
        }
        
        $user = $this->_userBackend->updateUser($_user);

        // remove user from primary group, if primary group changes
        if($oldUser->accountPrimaryGroup != $user->accountPrimaryGroup) {
            Tinebase_Group::getInstance()->removeGroupMember($oldUser->accountPrimaryGroup, $user);
        }
        // always add user to primary group
        Tinebase_Group::getInstance()->addGroupMember($user->accountPrimaryGroup, $user);
        
        Tinebase_TransactionManager::getInstance()->commitTransaction($transactionId);
        
        // fire needed events
        $event = new Admin_Event_UpdateAccount;
        $event->account = $user;
        Tinebase_Event::fireEvent($event);
        
        if (!empty($_password) && !empty($_passwordRepeat)) {
            $this->setAccountPassword($_user, $_password, $_passwordRepeat);
        }

        return $user;
    }
    
    /**
     * create user
     *
     * @param  Tinebase_Model_FullUser  $_account 		  the account
     * @param  string 					$_password 		  the new password
     * @param  string 					$_passwordRepeat  the new password again
     * @return Tinebase_Model_FullUser
     */
    public function create(Tinebase_Model_FullUser $_user, $_password, $_passwordRepeat)
    {
        $this->checkRight('MANAGE_ACCOUNTS');
        
        // avoid forging accountId, get's created in backend
        unset($_user->accountId);
        
        $transactionId = Tinebase_TransactionManager::getInstance()->startTransaction(Tinebase_Core::getDb());
        
        if ($_user->visibility == Tinebase_Model_User::VISIBILITY_DISPLAYED && empty($_user->container_id)) {
            $_user->visibility = Tinebase_Model_User::VISIBILITY_HIDDEN;
        }
        
        if (Tinebase_Application::getInstance()->isInstalled('Addressbook') === true && ! empty($_user->container_id)) {
            $contact = $this->createOrUpdateContact($_user);
            $_user->contact_id = $contact->getId();
        }
        
        $user = $this->_userBackend->addUser($_user);
        
        Tinebase_Group::getInstance()->addGroupMember($user->accountPrimaryGroup, $user);
        
        Tinebase_TransactionManager::getInstance()->commitTransaction($transactionId);
        
        $event = new Admin_Event_AddAccount();
        $event->account = $user;
        Tinebase_Event::fireEvent($event);
        
        if (!empty($_password) && !empty($_passwordRepeat)) {
            $this->setAccountPassword($user, $_password, $_passwordRepeat);
        }

        return $user;
    }
    
    /**
     * delete accounts
     *
     * @param   mixed $_accountIds  array of account ids
     * @return  array with success flag
     */
    public function delete($_accountIds)
    {
        $this->checkRight('MANAGE_ACCOUNTS');
        
        $groupsBackend = Tinebase_Group::getInstance();
        
        foreach ((array)$_accountIds as $accountId) {
            Tinebase_Core::getLogger()->info(__METHOD__ . '::' . __LINE__ . " about to remove user with id: {$accountId}");
            
            $oldUser = $this->get($accountId);
            
            $memberships = $groupsBackend->getGroupMemberships($accountId);
            if (Tinebase_Core::isLogLevel(Zend_Log::DEBUG)) Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . " removing user from groups: " . print_r($memberships, true));
            
            foreach ((array)$memberships as $groupId) {
                $groupsBackend->removeGroupMember($groupId, $accountId);
            }
            
            if ($this->_manageImapEmailUser) {
                $this->_imapUserBackend->deleteUser($accountId);
            }
            if ($this->_manageSmtpEmailUser) {
                $this->_smtpUserBackend->deleteUser($accountId);
            }
            if (Tinebase_Application::getInstance()->isInstalled('Addressbook') === true && !empty($oldUser->contact_id)) {
                $this->_deleteContact($oldUser->contact_id);
            }
            
            $this->_userBackend->deleteUser($accountId);
        }
    }
    
    /**
     * returns all shared addressbooks
     * 
     * @return Tinebase_Record_RecordSet of shared addressbooks
     * 
     * @todo do we need to fetch ALL shared containers here (even if admin user has NO grants for them)?
     */
    public function searchSharedAddressbooks()
    {
        $this->checkRight('MANAGE_ACCOUNTS');
        
        return Tinebase_Container::getInstance()->getSharedContainer($this->_currentAccount, 'Addressbook', Tinebase_Model_Grants::GRANT_READ, TRUE);
    }
    
    /**
     * create or update contact in addressbook sql backend
     * 
     * @param  Tinebase_Model_FullUser $_user
     * @return Addressbook_Model_Contact
     */
    public function createOrUpdateContact(Tinebase_Model_FullUser $_user)
    {
        $contactsBackend = Addressbook_Backend_Factory::factory(Addressbook_Backend_Factory::SQL);
        
        try {
            if (empty($_user->contact_id)) { // jump to catch block
                throw new Tinebase_Exception_NotFound('contact_id is empty');
            }
            
            $contact = $contactsBackend->get($_user->contact_id);
            
            // update exisiting contact
            $contact->n_family   = $_user->accountLastName;
            $contact->n_given    = $_user->accountFirstName;
            $contact->n_fn       = $_user->accountFullName;
            $contact->n_fileas   = $_user->accountDisplayName;
            $contact->email      = $_user->accountEmailAddress;
            $contact->type       = Addressbook_Model_Contact::CONTACTTYPE_USER;
            $contact->container_id = $_user->container_id;
            
            // add modlog info
            Tinebase_Timemachine_ModificationLog::setRecordMetaData($contact, 'update');
            
            $contact = $contactsBackend->update($contact);
            
        } catch (Tinebase_Exception_NotFound $tenf) {
            // add new contact
            $contact = new Addressbook_Model_Contact(array(
                'n_family'      => $_user->accountLastName,
                'n_given'       => $_user->accountFirstName,
                'n_fn'          => $_user->accountFullName,
                'n_fileas'      => $_user->accountDisplayName,
                'email'         => $_user->accountEmailAddress,
                'type'          => Addressbook_Model_Contact::CONTACTTYPE_USER,
                'container_id'  => $_user->container_id
            ));
            
            // add modlog info
            Tinebase_Timemachine_ModificationLog::setRecordMetaData($contact, 'create');
    
            $contact = $contactsBackend->create($contact);        
        }
        
        return $contact;
    }
    
    /**
     * delete contact associated with user
     * 
     * @param string  $_contactId
     */
    protected function _deleteContact($_contactId)
    {
        $contactsBackend = Addressbook_Backend_Factory::factory(Addressbook_Backend_Factory::SQL);
        
        $contactsBackend->delete($_contactId);        
    }
}
