import React, { Component } from 'react'
import { connect } from 'react-redux'
import { cloneDeep } from 'lodash'

import {
  ButtonLink,
  ButtonRound,
  EditableText,
  LoaderText,
  Modal
} from '../../components'

import {
  glossaryToggleNewEntryModal,
  glossaryCreateNewEntry
} from '../../actions/glossary'
import StringUtils from '../../utils/StringUtils'

class NewEntryModal extends Component {
  constructor (props) {
    super(props)
    this.state = {
      entry: cloneDeep(props.entry)
    }
  }
  handleContentChanged (e) {
    let entry = this.state.entry
    entry.srcTerm.content = e.target.value
    this.setState({
      entry: entry
    })
  }
  handlePosChanged (e) {
    let entry = this.state.entry
    entry.pos = e.target.value
    this.setState({
      entry: entry
    })
  }
  handleDescChanged (e) {
    let entry = this.state.entry
    entry.description = e.target.value
    this.setState({
      entry: entry
    })
  }
  handleCancel () {
    this.resetFields()
    this.props.handleNewEntryDisplay(false)
  }

  resetFields () {
    this.state = {
      entry: cloneDeep(this.props.entry)
    }
  }

  render () {
    const {
      entry,
      show,
      isSaving,
      handleNewEntryDisplay,
      handleNewEntryCreate
      } = this.props
    const isAllowSave =
      !StringUtils.isEmptyOrNull(this.state.entry.srcTerm.content)

    return (
      <Modal
        show={show}
        onHide={() => { this.handleCancel(); handleNewEntryDisplay(false) }}
        rootClose>
        <Modal.Header>
          <Modal.Title>New Term</Modal.Title>
        </Modal.Header>
        <Modal.Body atomic={{t: 'Ta(start)'}} scrollable={false}>
          <div className='Mb(rh)'>
            <label className='Fw(b)'>Term</label>
            <EditableText
              editable={true}
              editing={true}
              placeholder='The new term'
              maxLength={255}
              onChange={::this.handleContentChanged}>
              {this.state.entry.srcTerm.content}
            </EditableText>
          </div>
          <div className='Mb(rh)'>
            <label className='Fw(b)'>Part of speech</label>
            <EditableText
              editable={true}
              editing={true}
              theme={{root: {m: 'Mb(rh)'}}}
              placeholder='Noun, Verb, etc'
              maxLength={255}
              onChange={::this.handlePosChanged}>
              {this.state.entry.pos}
            </EditableText>
          </div>
          <div className='Mb(rh)'>
            <label className='Fw(b)'>Description</label>
            <EditableText
              editable={true}
              editing={true}
              placeholder='The definition of this term'
              maxLength={255}
              onChange={::this.handleDescChanged}>
              {this.state.entry.description}
            </EditableText>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <ButtonLink
            atomic={{m: 'Mend(r1)'}}
            disabled={isSaving}
            onClick={() => this.handleCancel()}>
            Cancel
          </ButtonLink>
          <ButtonRound
            type='primary'
            disabled={!isAllowSave || isSaving}
            onClick={() => { this.resetFields(); handleNewEntryCreate(entry) }}>
            <LoaderText loading={isSaving} loadingText='Saving'>
              Save
            </LoaderText>
          </ButtonRound>
        </Modal.Footer>
      </Modal>)
  }
}

NewEntryModal.propType = {}

const mapStateToProps = (state) => {
  const { newEntry } = state.glossary
  return {
    entry: newEntry.entry,
    show: newEntry.show,
    isSaving: newEntry.isSaving
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,
    handleNewEntryDisplay: (display) =>
      dispatch(glossaryToggleNewEntryModal(display)),
    handleNewEntryCreate: (entry) => dispatch(glossaryCreateNewEntry(entry))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(NewEntryModal)
