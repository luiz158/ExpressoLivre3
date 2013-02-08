<?php
/**
 * Tine 2.0

 * @package     HumanResources
 * @subpackage  Model
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Alexander Stintzing <a.stintzing@metaways.de>
 * @copyright   Copyright (c) 2012 Metaways Infosystems GmbH (http://www.metaways.de)
 */

/**
 * class to hold CostCenter data
 *
 * @package     HumanResources
 * @subpackage  Model
 */
class HumanResources_Model_CostCenter extends Tinebase_Record_Abstract
{
    /**
     * key in $_validators/$_properties array for the filed which
     * represents the identifier
     * @var string
     */
    protected $_identifier = 'id';

    /**
     * application the record belongs to
     * @var string
     */
    protected $_application = 'HumanResources';

    protected static $_resolveForeignIdFields = array(
        'HumanResources_Model_Employee' => 'employee_id',
        'Sales_Model_CostCenter'        => 'cost_center_id',
    );

    /**
     * list of zend validator
     * this validators get used when validating user generated content with Zend_Input_Filter
     * @var array
     */
    protected $_validators = array(
        'id'                    => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'employee_id'           => array(Zend_Filter_Input::ALLOW_EMPTY => false),
        'start_date'            => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'cost_center_id'        => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        // modlog information
        'created_by'            => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'creation_time'         => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'last_modified_by'      => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'last_modified_time'    => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'is_deleted'            => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'deleted_time'          => array(Zend_Filter_Input::ALLOW_EMPTY => true),
        'deleted_by'            => array(Zend_Filter_Input::ALLOW_EMPTY => true),
    );

    /**
     * name of fields containing datetime or an array of datetime information
     * @var array list of datetime fields
     */
    protected $_datetimeFields = array(
        'creation_time',
        'last_modified_time',
        'deleted_time',
        'start_date',
    );
}