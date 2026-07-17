/**
 * Maps card IDs to their artwork paths in /public/cards/.
 * Cards not listed here will render with a placeholder sigil.
 */
export const CARD_ART: Record<string, string> = {
  // ── Core ──────────────────────────────────────────────────────────────────
  congregation_meets:       '/cards/congregation_meets.jpeg',
  stranger_asks_questions:  '/cards/stranger_asks_questions.jpeg',
  the_landlord_cometh:      '/cards/the_landlord_cometh.jpeg',
  follower_confesses_doubt: '/cards/follower_confesses_doubt.jpeg',
  relic_market:             '/cards/relic_market.jpeg',
  word_spreads:             '/cards/word_spreads.jpeg',
  the_old_book:             '/cards/the_old_book.jpeg',
  supplies_dwindle:         '/cards/supplies_dwindle.jpeg',
  rival_stirs:              '/cards/rival_stirs.jpeg',
  the_donation:             '/cards/the_donation.jpeg',

  // ── Common ────────────────────────────────────────────────────────────────
  the_harbour:              '/cards/the_harbour.jpeg',
  the_harbormaster:         '/cards/the_harbormaster.jpeg',
  academic_society:         '/cards/academic_society.jpeg',
  woodcutters_report:       '/cards/woodcutters_report.jpeg',
  the_printing_press:       '/cards/the_printing_press.jpeg',
  the_opium_den:            '/cards/the_opium_den.jpeg',
  the_inheritance:          '/cards/the_inheritance.jpeg',
  the_census_agent:         '/cards/the_census_agent.jpeg',
  local_elections:          '/cards/local_elections.jpeg',
  travelling_merchant:      '/cards/travelling_merchant.jpeg',
  the_newspaper:            '/cards/the_newspaper.jpeg',
  the_fire:                 '/cards/the_fire.jpeg',
  the_seance:               '/cards/the_seance.jpeg',
  the_collection:           '/cards/the_collection.jpeg',
  the_complaint:            '/cards/the_complaint.jpeg',
  the_delayed_shipment:     '/cards/the_delayed_shipment.jpeg',
  the_left_item:            '/cards/the_left_item.jpeg',

  // ── Rare ──────────────────────────────────────────────────────────────────
  the_defector:             '/cards/the_defector.jpeg',
  artefact_from_deep:       '/cards/artefact_from_deep.jpeg',
  dreaming_academic:        '/cards/dreaming_academic.jpeg',
  dark_young_pilgrim:       '/cards/dark_young_pilgrim.jpeg',
  clarence:                 '/cards/clarence.jpeg',
  dark_young_guardian:      '/cards/dark_young_guardian.jpeg',
  the_diocese_sends_word:   '/cards/the_diocese_sends_word.jpeg',
  the_wedding_rite:         '/cards/the_wedding_rite.jpeg',

  // ── God Path — Y'ha-nthlei ────────────────────────────────────────────────
  yha_nthlei_1:             '/cards/yha_nthlei_1.jpeg',
  yha_nthlei_2:             '/cards/yha_nthlei_2.jpeg',
  yha_nthlei_3:             '/cards/yha_nthlei_3.jpeg',
  yha_nthlei_4:             '/cards/yha_nthlei_4.jpeg',
  yha_nthlei_5:             '/cards/yha_nthlei_5.jpeg',
  yha_nthlei_6:             '/cards/yha_nthlei_6.jpeg',

  // ── God Path — Nyarlathotep ───────────────────────────────────────────────
  nyarlathotep_1:           '/cards/nyarlathotep_1.jpeg',
  nyarlathotep_2:           '/cards/nyarlathotep_2.jpeg',
  nyarlathotep_3:           '/cards/nyarlathotep_3.jpeg',
  nyarlathotep_4:           '/cards/nyarlathotep_4.jpeg',
  nyarlathotep_5:           '/cards/nyarlathotep_5.jpeg',
  nyarlathotep_6:           '/cards/nyarlathotep_6.jpeg',
  the_moving_painting:      '/cards/the_moving_painting.jpeg',

  // ── God Path — Shub-Niggurath ─────────────────────────────────────────────
  shub_niggurath_1:         '/cards/shub_niggurath_1.jpeg',
  shub_niggurath_2:         '/cards/shub_niggurath_2.jpeg',
  shub_niggurath_3:         '/cards/shub_niggurath_3.jpeg',
  shub_niggurath_4:         '/cards/shub_niggurath_4.jpeg',
  shub_niggurath_5:         '/cards/shub_niggurath_5.jpeg',
  shub_niggurath_6:         '/cards/shub_niggurath_6.jpeg',
  shub_words_come_naturally: '/cards/shub_words_come_naturally.jpeg',

  // ── Doom stack ────────────────────────────────────────────────────────────
  unravelling_1:            '/cards/unravelling_1.jpeg',
  unravelling_2:            '/cards/unravelling_2.jpeg',
  unravelling_3:            '/cards/unravelling_3.jpeg',
  unravelling_4:            '/cards/unravelling_4.jpeg',
  unravelling_5:            '/cards/unravelling_5.jpeg',
  the_weight_of_it:         '/cards/the_weight_of_it.jpeg',

  // ── Threats ───────────────────────────────────────────────────────────────
  the_detective:            '/cards/the_detective.jpeg',
  the_newspaper_article:    '/cards/the_newspaper_article.jpeg',
  arson_inspector:          '/cards/arson_inspector.jpeg',
  missing_persons:          '/cards/missing_persons.jpeg',
  selectman_has_questions:  '/cards/selectman_has_questions.jpeg',
  neighbour_has_concerns:   '/cards/neighbour_has_concerns.jpeg',
  something_came_to_the_door: '/cards/something_came_to_the_door.jpeg',
  revelation:               '/cards/revelation.jpeg',
  wandering_soul:           '/cards/wandering_soul.jpeg',
  investigators_file:       '/cards/investigators_file.jpeg',
  local_gossip:             '/cards/local_gossip.jpeg',
  lost_safehouse:           '/cards/lost_safehouse.jpeg',
  loose_end:                '/cards/loose_end.jpeg',
  desperate_congregation:   '/cards/desperate_congregation.jpeg',
  strings_attached:         '/cards/strings_attached.jpeg',
  their_representative:     '/cards/their_representative.jpeg',
  their_survivors:          '/cards/their_survivors.jpeg',
  rival_escalation:         '/cards/rival_escalation.jpeg',
  their_report:             '/cards/their_report.jpeg',
  their_suspicion:          '/cards/their_suspicion.jpeg',
  political_debt:           '/cards/political_debt.jpeg',
  scrutiny:                 '/cards/scrutiny.jpeg',
  forgers_debt:             '/cards/forgers_debt.jpeg',
  what_was_done:            '/cards/what_was_done.jpeg',
  what_was_already_read:    '/cards/what_was_already_read.jpeg',
  cursed_object:            '/cards/cursed_object.jpeg',
  merchant_remembers:       '/cards/merchant_remembers.jpeg',
  evidence_of_rival:        '/cards/evidence_of_rival.jpeg',
  public_scrutiny:          '/cards/public_scrutiny.jpeg',
  the_dreamer:              '/cards/dream_cards.jpeg',
  a_useful_contact:         '/cards/a_useful_contact.jpeg',
  his_research_notes:       '/cards/his_research_notes.jpeg',
  something_on_the_hook:    '/cards/something_on_the_hook.jpeg',
  the_thing_in_the_tank:    '/cards/the_thing_in_the_tank.jpeg',
  fishermans_return:        '/cards/fishermans_return.jpeg',
  marsh_connection:         '/cards/marsh_connection.jpeg',
  grove_awaits:             '/cards/grove_awaits.jpeg',
  covenant_demands:         '/cards/covenant_demands.jpeg',
  ongoing_arrangement:      '/cards/ongoing_arrangement.jpeg',
  their_former_associates:  '/cards/their_former_associates.jpeg',
  innsmouth_look_marked:    '/cards/innsmouth_look_marked.jpeg',
  it_still_needs_feeding:   '/cards/it_still_needs_feeding.jpeg',
  an_unremarkable_stump:    '/cards/an_unremarkable_stump.jpeg',
  terms_remain:             '/cards/terms_remain.jpeg',
  changed_follower:         '/cards/changed_follower.jpeg',

  // ── Treats ────────────────────────────────────────────────────────────────
  the_ordinary_pie:         '/cards/the_ordinary_pie.jpeg',

  // ── Overflow threats ──────────────────────────────────────────────────────
  the_ledger_is_noticed:    '/cards/the_ledger_is_noticed.jpeg',
  the_wrong_rooms:          '/cards/the_wrong_rooms.jpeg',
  theyre_not_listening:     '/cards/theyre_not_listening.jpeg',

  // ── Deficit threats (P17-16) ──────────────────────────────────────────────
  deficit_gold:             '/cards/deficit_gold.jpeg',
  deficit_followers:        '/cards/deficit_followers.jpeg',
  deficit_influence:        '/cards/deficit_influence.jpeg',

  // ── Mutations ─────────────────────────────────────────────────────────────
  second_account:           '/cards/second_account.jpeg',
  word_has_spread_further:  '/cards/word_has_spread_further.jpeg',
  second_run:               '/cards/second_run.jpeg',
  still_burning:            '/cards/still_burning.jpeg',
  still_open:               '/cards/still_open.jpeg',
  the_merchant_again:       '/cards/the_merchant_again.jpeg',
}
