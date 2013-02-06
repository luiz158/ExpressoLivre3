<?php

/**
 * Tine 2.0
 *
 * @package     Felamimail
 * @subpackage  Record
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Mario Cesar Kolling <mario.kolling@serpro.gov.br>
 * @copyright   Copyright (c) 2009-2013 Serpro (http://www.serpro.gov.br)
 *
 */

interface Tinebase_Record_SearchTotalCountInterface
{   
    public function setSearchTotalCount($_totalCount);
    public function getSearchTotalCount();
}