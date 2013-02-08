<?php
/**
 * WorkingTime controller for HumanResources application
 *
 * @package     HumanResources
 * @subpackage  Controller
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Alexander Stintzing <a.stintzing@metaways.de>
 * @copyright   Copyright (c) 2012 Metaways Infosystems GmbH (http://www.metaways.de)
 *
 */

/**
 * WorkingTime controller class for HumanResources application
 *
 * @package     HumanResources
 * @subpackage  Controller
 */
class HumanResources_Controller_WorkingTime extends Tinebase_Controller_Record_Abstract
{
    /**
     * duplicate check fields / if this is NULL -> no duplicate check
     *
     * @var array
     */
    protected $_duplicateCheckFields = array(array('title'));
    
    /**
     * the constructor
     *
     * don't use the constructor. use the singleton
     */
    private function __construct() {
        $this->_applicationName = 'HumanResources';
        $this->_backend = new HumanResources_Backend_WorkingTime();
        $this->_modelName = 'HumanResources_Model_WorkingTime';
        $this->_purgeRecords = TRUE;
        // activate this if you want to use containers
        $this->_doContainerACLChecks = FALSE;
    }

    /**
     * holds the instance of the singleton
     *
     * @var HumanResources_Controller_WorkingTime
     */
    private static $_instance = NULL;

    /**
     * the singleton pattern
     *
     * @return HumanResources_Controller_WorkingTime
     */
    public static function getInstance()
    {
        if (self::$_instance === NULL) {
            self::$_instance = new HumanResources_Controller_WorkingTime();
        }

        return self::$_instance;
    }

    protected function _setNotes($_updatedRecord, $_record, $_systemNoteType = Tinebase_Model_Note::SYSTEM_NOTE_NAME_CREATED, $_currentMods = NULL) {
    }
}
