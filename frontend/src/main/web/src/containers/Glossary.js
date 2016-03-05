import React, { Component } from 'react'
import { connect } from 'react-redux'
import Helmet from 'react-helmet'
import ReactList from 'react-list'
import { ButtonLink, ButtonRound, Icon, LoaderText, Select } from 'zanata-ui'
import { debounce, cloneDeep } from 'lodash'
import { replaceRouteQuery } from '../utils/RoutingHelpers'
import {
  EditableText,
  Header,
  Page,
  Row,
  ScrollView,
  TableCell,
  TableRow,
  TextInput,
  View,
  DeleteEntryModal
} from '../components'
import {
  glossaryChangeLocale,
  glossaryUpdateIndex,
  glossaryFilterTextChanged,
  glossaryGetTermsIfNeeded,
  glossarySelectTerm,
  glossaryUpdateField,
  glossaryDeleteEntry,
  glossaryEntryReset
} from '../actions/glossary'

let sameRenders = 0

const isSameRender = () => {
  sameRenders++
  console.debug('Same Render', sameRenders)
  if (sameRenders > 10) {
    sameRenders = 0
    console.debug('Debug, Reset')
  }
}

const loadingContainerTheme = {
  base: {
    ai: 'Ai(c)',
    flxg: 'Flxg(1)',
    jc: 'Jc(c)',
    w: 'W(100%)'
  }
}

class Glossary extends Component {
  constructor () {
    super()
    // Need to add the debounce to onScroll here
    // So it creates a new debounce for each instance
    this.onScroll = debounce(this.onScroll, 100)
  }
  renderItem (index, key) {
    const {
      handleSelectTerm,
      handleTermFieldUpdate,
      handleDeleteEntry,
      handleEntryReset,
      termIds,
      terms,
      transLoading,
      selectedTransLocale,
      selectedTerm,
      permission
    } = this.props
    const termId = termIds[index]
    const selected = termId === selectedTerm.id
    const term = selected ? selectedTerm : termId ? cloneDeep(terms[termId]) : false
    const transContent = term && term.glossaryTerms[1]
      ? term.glossaryTerms[1].content
      : ''
    const transSelected = !!selectedTransLocale
    // TODO: Make this only set when switching locales
    if (!term) {
      return (
        <TableRow key={key}>
          <TableCell>
            <div className='LineClamp(1,24px) Px(rq)'>Loading…</div>
          </TableCell>
        </TableRow>
      )
    }
    if (index === 1) {
      isSameRender()
    }

    const isTermModified = transSelected
      ? (term.status && term.status.isTransModified)
      : (term.status && term.status.isSrcModified)
    const displayUpdateButton = permission.canUpdateEntry && isTermModified

    return (
      <TableRow highlight
        className='editable'
        key={key}
        selected={selected}
        onClick={() => handleSelectTerm(termId)}>
        <TableCell size='2' tight>
          <EditableText
            editable={false}
            editing={selected}>
            {term.glossaryTerms[0].content}
          </EditableText>
        </TableCell>
        <TableCell size={transSelected ? '2' : '1'} tight={transSelected}>
          {transSelected
            ? transLoading
              ? <div className='LineClamp(1,24px) Px(rq)'>Loading…</div>
            : (<EditableText
                editable={transSelected && permission.canUpdateEntry}
                editing={selected}
                onChange={(e) => handleTermFieldUpdate('locale', e)}
                placeholder='Add a translation…'
                emptyReadOnlyText='No translation'>
                {transContent}
              </EditableText>)
            : <div className='LineClamp(1,24px) Px(rq)'>{term.termsCount}</div>
          }
        </TableCell>
        <TableCell hideSmall>
          <EditableText
            editable={!transSelected && permission.canUpdateEntry}
            editing={selected}
            onChange={(e) => handleTermFieldUpdate('pos', e)}
            placeholder='Add part of speech…'
            emptyReadOnlyText='No part of speech'>
            {term.pos}
          </EditableText>
        </TableCell>
        {!transSelected ? (
            <TableCell hideSmall>
              <EditableText
                editable={!transSelected && permission.canUpdateEntry}
                editing={selected}
                onChange={(e) => handleTermFieldUpdate('description', e)}
                placeholder='Add a description…'
                emptyReadOnlyText='No description'>
                {term.description}
              </EditableText>
            </TableCell>
          ) : ''
        }
        <TableCell hideSmall>
          <ButtonLink>
            <Icon name='info'/>
          </ButtonLink>

          {transSelected ? (
              <ButtonLink theme={{base: {m: 'Mstart(re)'}}} type='muted'>
                <Icon name='comment'/>
              </ButtonLink>
            ) : ''}

          {displayUpdateButton ? (
              <ButtonRound theme={{base: {m: 'Mstart(rh)'}}} type='primary'>
                {term.status && term.status.isSaving ?
                  (<LoaderText loading loadingText='Updating'>Update</LoaderText>)
                  : 'Update'
                }
              </ButtonRound>
            ) : ''
          }

          {displayUpdateButton ? (
              <ButtonLink theme={{base: {m: 'Mstart(rh)'}}}
                          onClick={() => handleEntryReset(termId)}>
                Cancel
              </ButtonLink>
            ) : ''
          }

          {permission.canDeleteEntry ? (
              <DeleteEntryModal id={termId}
                                entry={term}
                                className='Mstart(rh)'
                                onDelete={handleDeleteEntry}/>
            ) : ''
          }

        </TableCell>
      </TableRow>
    )
  }
  currentLocaleCount () {
    if (this.props.filterText && this.props.results) {
      return this.props.results
        .filter(result => result.glossaryTerms.length >= 2).length
    } else {
      const selectedTransLocaleObj = this.props.transLocales
        .find((locale) => locale.value === this.props.selectedTransLocale)
      return selectedTransLocaleObj ? selectedTransLocaleObj.count : 0
    }
  }
  currentLocaleName () {
    const selectedTransLocaleObj = this.props.transLocales
      .find((locale) => locale.value === this.props.selectedTransLocale)
    return selectedTransLocaleObj
      ? selectedTransLocaleObj.label
      : 'Translation'
  }
  localeOptionsRenderer (op) {
    return (
    <span className='D(f) Ai(c) Jc(sb)'>
      <span className='Flx(flx1) LineClamp(1)' title={op.label}>
        {op.label}
      </span>
      <span className='Flx(n) Pstart(re) Ta(end) Maw(r4) LineClamp(1)'>
        {op.value}
      </span>
      <span className='Flx(n) C(muted) Pstart(re) Ta(end) LineClamp(1) W(r2)'>
        {op.count}
      </span>
    </span>
    )
  }
  onScroll () {
    // Debounced by 100ms in super()
    if (!this.list) return
    const {
      dispatch,
      location
    } = this.props
    const loadingThreshold = 250
    const indexRange = this.list.getVisibleRange()
    const newIndex = indexRange[0]
    const newIndexEnd = indexRange[1]
    replaceRouteQuery(location, {
      index: newIndex
    })
    dispatch(glossaryUpdateIndex(newIndex))
    dispatch(glossaryGetTermsIfNeeded(newIndex))
    // If close enough, load the prev/next page too
    dispatch(glossaryGetTermsIfNeeded(newIndex - loadingThreshold))
    dispatch(glossaryGetTermsIfNeeded(newIndexEnd + loadingThreshold))
  }

  render () {
    const {
      filterText = '',
      termsLoading,
      termCount,
      scrollIndex = 0,
      statsLoading,
      transLocales,
      selectedTransLocale,
      handleTranslationLocaleChange,
      handleFilterFieldUpdate,
      permission
    } = this.props
    const currentLocaleCount = this.currentLocaleCount()
    const transSelected = !!selectedTransLocale
    return (
      <Page>
        <Helmet title='Glossary' />
        <ScrollView onScroll={::this.onScroll}>
          <Header title='Glossary'
            extraElements={(
              <View theme={{base: { ai: 'Ai(c)', fld: '' }}}>
                <TextInput
                  theme={{base: { flx: 'Flx(flx1)', m: 'Mstart(rh)--md' }}}
                  type='search'
                  placeholder='Search Terms…'
                  accessibilityLabel='Search Terms'
                  defaultValue={filterText}
                  onChange={handleFilterFieldUpdate} />
                  {permission.canAddNewEntry ? (
                    <ButtonLink theme={{ base: { m: 'Mstart(rh)' } }}>
                      <Row>
                        <Icon name='import' className='Mend(rq)'
                          theme={{ base: { m: 'Mend(rq)' } }}/>
                        <span className='Hidden--lesm'>Import Glossary</span>
                      </Row>
                    </ButtonLink> ) : ''}

                   {permission.canAddNewEntry ? (
                      <ButtonLink theme={{ base: { m: 'Mstart(rh)' } }}>
                        <Row>
                          <Icon name='plus' className='Mend(rq)'
                            theme={{ base: { m: 'Mend(rq)' } }}/>
                          <span className='Hidden--lesm'>New Term</span>
                        </Row>
                      </ButtonLink> ) : ''
                   }

              </View>
            )}>
            <View theme={{
              base: {
                w: 'W(100%)',
                m: 'Mt(rq) Mt(rh)--sm'
              }}}>
              <TableRow
                theme={{ base: { bd: '' } }}
                className='Flxg(1)'>
                <TableCell size='2'>
                  <Row>
                    <Icon name='glossary'
                      className='C(neutral) Mend(re)' />
                    <span className='LineClamp(1,24px)'>
                      English (United States)
                    </span>
                    <span className='C(muted) Mstart(rq)'>{termCount}</span>
                  </Row>
                </TableCell>
                <TableCell tight size={transSelected ? '2' : '1'}
                  theme={{base: {lineClamp: ''}}}>
                  <Select
                    name='language-selection'
                    placeholder={statsLoading
                      ? 'Loading…' : 'Select a language…'}
                    className='Flx(flx1)'
                    isLoading={statsLoading}
                    value={selectedTransLocale}
                    options={transLocales}
                    pageSize={20}
                    optionRenderer={this.localeOptionsRenderer}
                    onChange={handleTranslationLocaleChange}
                  />
                  {selectedTransLocale &&
                    (<Row>
                      <Icon name='translate'
                        className='C(neutral) Mstart(rq) Mend(re)' />
                      <span className='C(muted)'>
                        {currentLocaleCount}
                      </span>
                    </Row>)
                  }
                </TableCell>
                <TableCell hideSmall>
                  <div className="LineClamp(1,24px)">Part of Speech</div>
                </TableCell>
                {!transSelected ?
                  (
                  <TableCell hideSmall>
                    Description
                  </TableCell>
                  ) : ''
                }
                <TableCell hideSmall>

                </TableCell>
              </TableRow>
            </View>
          </Header>
          <View theme={{ base: {p: 'Pt(r6) Pb(r2)'} }}>
            { termsLoading && !termCount
              ? (
                  <View theme={loadingContainerTheme}>
                    <LoaderText theme={{ base: { fz: 'Fz(ms1)' } }}
                      size='1'
                      loading />
                  </View>
                )
              : (
                <ReactList
                  useTranslate3d
                  itemRenderer={::this.renderItem}
                  length={termCount}
                  type='uniform'
                  initialIndex={scrollIndex || 0}
                  ref={c => this.list = c}
                />
              )
            }
          </View>
        </ScrollView>
      </Page>
    )
  }
}

const mapStateToProps = (state) => {
  const {
    page,
    selectedTerm,
    stats,
    statsLoading,
    termsLoading,
    terms,
    termIds,
    termCount,
    filter,
    permission
  } = state.glossary
  const query = state.routing.location.query
  return {
    location: state.routing.location,
    terms,
    termIds,
    termCount,
    termsLoading,
    page,
    statsLoading,
    transLocales: stats.transLocales,
    filterText: filter,
    selectedTerm: selectedTerm,
    selectedTransLocale: query.locale,
    scrollIndex: Number.parseInt(query.index, 10),
    permission
  }
}

const mapDispatchToProps = (dispatch) => {
  const updateFilter = debounce(val => dispatch(glossaryFilterTextChanged(val)), 200)
  const updateTerm = debounce((field, val) => dispatch(glossaryUpdateField({ field: field, value: val })), 200)

  return {
    dispatch,
    handleSelectTerm: (termId) => dispatch(glossarySelectTerm(termId)),
    handleTranslationLocaleChange: (selectedLocale) =>
      dispatch(
        glossaryChangeLocale(selectedLocale ? selectedLocale.value : '')
      ),
    handleFilterFieldUpdate: (event) => {
      updateFilter(event.target.value || '')
    },
    handleTermFieldUpdate: (field, event) => {
      updateTerm(field, event.target.value || '')
    },
    handleDeleteEntry: (termId) => dispatch(glossaryDeleteEntry(termId)),
    handleEntryReset: (termId) => dispatch(glossaryEntryReset(termId))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Glossary)